import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'dairy_owner' | 'delivery_boy' | 'customer';
  dairy_id?: string;
  address?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  location_notes?: string;
  birthday?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== CREATE USER ACCOUNT FUNCTION STARTED ===');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Supabase admin client initialized');

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      throw new Error('Missing authorization header');
    }

    // Verify the caller's token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      console.error('Unauthorized - auth error:', authError);
      throw new Error('Unauthorized');
    }

    console.log('Caller authenticated:', caller.email);

    // Get caller's profile to check role and dairy_id
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, dairy_id')
      .eq('id', caller.id)
      .single();

    if (profileError || !callerProfile) {
      console.error('Could not fetch caller profile:', profileError);
      throw new Error('Could not fetch caller profile');
    }

    console.log('Caller profile:', { role: callerProfile.role, dairy_id: callerProfile.dairy_id });

    const requestData: CreateUserRequest = await req.json();
    const { email, password, name, phone, role, dairy_id, address, area, latitude, longitude, location_notes, birthday } = requestData;

    console.log('Request data:', { email, name, phone, role, dairy_id: dairy_id || 'not provided', address });

    // Validation
    if (!email || !password || !name || !phone || !role) {
      console.error('Missing required fields');
      throw new Error('Missing required fields: email, password, name, phone, and role are required');
    }

    if (role !== 'dairy_owner' && role !== 'delivery_boy' && role !== 'customer') {
      console.error('Invalid role:', role);
      throw new Error('Invalid role');
    }

    // Permission checks
    console.log('Checking permissions...');
    if (callerProfile.role === 'super_admin') {
      console.log('Caller is super_admin - full permissions');
      // Super admin can create anyone
      if (role !== 'dairy_owner' && !dairy_id) {
        console.error('dairy_id missing for non-dairy_owner role');
        throw new Error('dairy_id is required for delivery_boy and customer');
      }
    } else if (callerProfile.role === 'dairy_owner') {
      console.log('Caller is dairy_owner - checking constraints');
      // Dairy owner can only create delivery_boy and customer for their dairy
      if (role === 'dairy_owner') {
        console.error('Dairy owner trying to create another dairy owner');
        throw new Error('Dairy owners cannot create other dairy owners');
      }
      if (!callerProfile.dairy_id) {
        console.error('Dairy owner has no associated dairy_id');
        throw new Error('Dairy owner has no associated dairy');
      }
      if (dairy_id && dairy_id !== callerProfile.dairy_id) {
        console.error('Dairy owner trying to create user for different dairy');
        throw new Error('Can only create users for your own dairy');
      }
      // Use the caller's dairy_id
      requestData.dairy_id = callerProfile.dairy_id;
      console.log('Using caller dairy_id:', requestData.dairy_id);
    } else {
      console.error('Insufficient permissions for role:', callerProfile.role);
      throw new Error('Insufficient permissions');
    }

    console.log(`Creating ${role} account for ${email} with dairy_id: ${requestData.dairy_id}`);

    // Determine if email confirmation is needed
    const emailConfirm = role === 'dairy_owner'; // Only dairy owners need email confirmation

    // Create auth user
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: !emailConfirm, // Skip confirmation for delivery_boy and customer
      user_metadata: {
        name,
        phone,
        role,
        dairy_id: requestData.dairy_id || null,
        address: address || null
      }
    });

    if (createError) {
      console.error('Error creating auth user:', createError);
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user returned');
    }

    console.log(`Auth user created with ID: ${authData.user.id}`);

    // Wait briefly for the trigger to create the profile, then update it with additional fields
    // The handle_new_user() trigger creates the initial profile from user_metadata
    await new Promise(resolve => setTimeout(resolve, 100));

    // Update the profile with additional fields (the trigger already created it)
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        phone,
        address: address || null,
        dairy_id: requestData.dairy_id || null
      })
      .eq('id', authData.user.id);

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError);
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Failed to update profile: ${profileUpdateError.message}`);
    }

    console.log('Profile updated successfully');

    // Create additional records based on role
    if (role === 'customer') {
      console.log('Creating customer record...');
      const { error: customerError } = await supabaseAdmin
        .from('customers')
        .insert({
          id: authData.user.id,
          dairy_id: requestData.dairy_id!,
          name,
          phone,
          email,
          address: address || '',
          area: area || null,
          latitude: latitude || null,
          longitude: longitude || null,
          location_notes: location_notes || null,
          birthday: birthday || null,
          anniversary_date: new Date().toISOString().split('T')[0], // Set join date as today
          status: 'active'
        });

      if (customerError) {
        console.error('Error creating customer record:', customerError);
        // Rollback: delete auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Failed to create customer record: ${customerError.message}`);
      }
      console.log('Customer record created successfully');
    } else if (role === 'delivery_boy') {
      console.log('Creating delivery boy record...');
      const { error: deliveryBoyError } = await supabaseAdmin
        .from('delivery_boys')
        .insert({
          id: authData.user.id, // CRITICAL: Set id to match auth user id
          dairy_id: requestData.dairy_id!,
          name,
          phone,
          email,
          address: address || '',
          status: 'active'
        });

      if (deliveryBoyError) {
        console.error('Error creating delivery boy record:', deliveryBoyError);
        // Rollback: delete auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Failed to create delivery boy record: ${deliveryBoyError.message}`);
      }
      console.log('Delivery boy record created successfully');
    }

    // Log to audit_log
    await supabaseAdmin
      .from('audit_log')
      .insert({
        user_id: caller.id,
        operation: 'INSERT',
        table_name: 'profiles',
        new_data: {
          created_user_id: authData.user.id,
          role,
          email,
          created_by: caller.email
        }
      });

    console.log('=== USER ACCOUNT CREATION COMPLETED SUCCESSFULLY ===');
    
    return new Response(
      JSON.stringify({
        success: true,
        user_id: authData.user.id,
        email: authData.user.email,
        role,
        email_confirmation_required: emailConfirm
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('=== ERROR IN CREATE-USER-ACCOUNT FUNCTION ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred while creating the account',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
