import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					hover: 'hsl(var(--primary-hover))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'fade-in-up': {
					'0%': {
						opacity: '0',
						transform: 'translateY(20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slide-in': {
					'0%': {
						transform: 'translateX(-100%)'
					},
					'100%': {
						transform: 'translateX(0)'
					}
				},
				'slide-up': {
					'0%': {
						opacity: '0',
						transform: 'translateY(100%)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'bounce-in': {
					'0%': {
						opacity: '0',
						transform: 'scale(0.3)'
					},
					'50%': {
						transform: 'scale(1.05)'
					},
					'70%': {
						transform: 'scale(0.9)'
					},
					'100%': {
						opacity: '1',
						transform: 'scale(1)'
					}
				},
				'bounce-subtle': {
					'0%, 100%': {
						transform: 'translateY(0)'
					},
					'50%': {
						transform: 'translateY(-5px)'
					}
				},
				'shimmer': {
					'100%': {
						transform: 'translateX(100%)'
					}
				},
				'success-circle': {
					'0%': {
						transform: 'scale(0)',
						opacity: '0'
					},
					'50%': {
						transform: 'scale(1.1)'
					},
					'100%': {
						transform: 'scale(1)',
						opacity: '1'
					}
				},
				'success-check': {
					'0%': {
						strokeDashoffset: '100'
					},
					'100%': {
						strokeDashoffset: '0'
					}
				},
				'success-ripple': {
					'0%': {
						transform: 'scale(1)',
						opacity: '0.5'
					},
					'100%': {
						transform: 'scale(2)',
						opacity: '0'
					}
				},
				'confetti': {
					'0%': {
						transform: 'translateY(0) rotate(0deg)',
						opacity: '1'
					},
					'100%': {
						transform: 'translateY(-100px) rotate(720deg)',
						opacity: '0'
					}
				},
				'coin-flip': {
					'0%': {
						transform: 'rotateY(0deg)'
					},
					'50%': {
						transform: 'rotateY(180deg)'
					},
					'100%': {
						transform: 'rotateY(360deg)'
					}
				},
				'float-up': {
					'0%': {
						opacity: '1',
						transform: 'translateY(0) translateX(-50%)'
					},
					'100%': {
						opacity: '0',
						transform: 'translateY(-30px) translateX(-50%)'
					}
				},
				'scale-press': {
					'0%, 100%': {
						transform: 'scale(1)'
					},
					'50%': {
						transform: 'scale(0.97)'
					}
				},
				'stagger-fade': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'gradient-shift': {
					'0%, 100%': {
						backgroundPosition: '0% 50%'
					},
					'50%': {
						backgroundPosition: '100% 50%'
					}
				},
				'typewriter': {
					'from': {
						width: '0'
					},
					'to': {
						width: '100%'
					}
				},
				'marquee': {
					'0%': { transform: 'translateX(0%)' },
					'100%': { transform: 'translateX(-50%)' }
				},
				'marquee-reverse': {
					'0%': { transform: 'translateX(-50%)' },
					'100%': { transform: 'translateX(0%)' }
				},
				'pulse-glow': {
					'0%, 100%': { boxShadow: '0 0 20px hsl(262.1 83.3% 57.8% / 0.3)' },
					'50%': { boxShadow: '0 0 40px hsl(262.1 83.3% 57.8% / 0.6)' }
				},
				'slide-in-bottom': {
					'0%': { transform: 'translateY(100%)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				'notification-slide': {
					'0%': { transform: 'translateX(100%)', opacity: '0' },
					'10%': { transform: 'translateX(0)', opacity: '1' },
					'90%': { transform: 'translateX(0)', opacity: '1' },
					'100%': { transform: 'translateX(100%)', opacity: '0' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'fade-in-up': 'fade-in-up 0.4s ease-out',
				'slide-in': 'slide-in 0.3s ease-out',
				'slide-up': 'slide-up 0.3s ease-out',
				'bounce-in': 'bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
				'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
				'shimmer': 'shimmer 2s infinite',
				'success-circle': 'success-circle 0.4s ease-out forwards',
				'success-check': 'success-check 0.3s ease-out 0.2s forwards',
				'success-ripple': 'success-ripple 0.6s ease-out forwards',
				'confetti': 'confetti 1s ease-out forwards',
				'coin-flip': 'coin-flip 0.6s ease-in-out',
				'float-up': 'float-up 1s ease-out forwards',
				'scale-press': 'scale-press 0.15s ease-in-out',
				'stagger-fade': 'stagger-fade 0.3s ease-out forwards',
				'gradient-shift': 'gradient-shift 3s ease infinite',
				'typewriter': 'typewriter 2s steps(40, end)',
				'marquee': 'marquee 30s linear infinite',
				'marquee-reverse': 'marquee-reverse 30s linear infinite',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
				'slide-in-bottom': 'slide-in-bottom 0.3s ease-out',
				'notification-slide': 'notification-slide 5s ease-in-out'
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-soft': 'var(--gradient-soft)'
			},
			boxShadow: {
				'soft': 'var(--shadow-soft)',
				'medium': 'var(--shadow-medium)',
				'strong': 'var(--shadow-strong)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
