import React from 'react';
import { cn } from '@/lib/utils';

interface BlogContentProps {
  content: string;
  className?: string;
}

export function BlogContent({ content, className }: BlogContentProps) {
  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    const lines = text.trim().split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: string[] = [];
    let listType: 'ul' | 'ol' | null = null;
    let inTable = false;
    let tableRows: string[][] = [];

    const flushList = () => {
      if (currentList.length > 0) {
        const ListTag = listType === 'ol' ? 'ol' : 'ul';
        elements.push(
          <ListTag key={elements.length} className={cn(
            "my-4 ml-6",
            listType === 'ol' ? 'list-decimal' : 'list-disc'
          )}>
            {currentList.map((item, i) => (
              <li key={i} className="text-muted-foreground mb-1">{item}</li>
            ))}
          </ListTag>
        );
        currentList = [];
        listType = null;
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0) {
        elements.push(
          <div key={elements.length} className="my-6 overflow-x-auto">
            <table className="w-full border-collapse border border-border">
              <thead>
                <tr className="bg-muted">
                  {tableRows[0].map((cell, i) => (
                    <th key={i} className="border border-border px-4 py-2 text-left font-semibold text-foreground">
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.slice(2).map((row, rowIdx) => (
                  <tr key={rowIdx} className="even:bg-muted/50">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="border border-border px-4 py-2 text-muted-foreground">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        inTable = false;
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Table detection
      if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
        flushList();
        inTable = true;
        const cells = trimmedLine.split('|').filter(cell => cell.trim() !== '');
        if (!trimmedLine.includes('---')) {
          tableRows.push(cells.map(cell => cell.trim()));
        }
        return;
      } else if (inTable) {
        flushTable();
      }

      // Empty line
      if (!trimmedLine) {
        flushList();
        return;
      }

      // Headers
      if (trimmedLine.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={index} className="text-2xl font-bold text-foreground mt-8 mb-4">
            {trimmedLine.replace('## ', '')}
          </h2>
        );
        return;
      }

      if (trimmedLine.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={index} className="text-xl font-semibold text-foreground mt-6 mb-3">
            {trimmedLine.replace('### ', '')}
          </h3>
        );
        return;
      }

      // Numbered list
      if (/^\d+\.\s/.test(trimmedLine)) {
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
        }
        currentList.push(trimmedLine.replace(/^\d+\.\s/, '').replace(/\*\*(.*?)\*\*/g, '$1'));
        return;
      }

      // Bullet list
      if (trimmedLine.startsWith('- ')) {
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        currentList.push(trimmedLine.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '$1'));
        return;
      }

      // Regular paragraph
      flushList();
      const processedLine = trimmedLine
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      elements.push(
        <p 
          key={index} 
          className="text-muted-foreground mb-4 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: processedLine }}
        />
      );
    });

    flushList();
    flushTable();

    return elements;
  };

  return (
    <div className={cn("prose prose-lg max-w-none", className)}>
      {renderContent(content)}
    </div>
  );
}
