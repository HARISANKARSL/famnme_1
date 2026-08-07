/**
 * ChatMarkdownRenderer — Custom styled markdown components for chat messages.
 *
 * Uses the FamilyAConnect design system:
 * - Headings: Playfair Display
 * - Links: Indigo #2F3E8F
 * - Tables: Gold #C2A46D borders
 * - Code blocks: Ivory #F6F2EA background
 */

import type { Components } from 'react-markdown'

export const chatMarkdownComponents: Components = {
  // Headings
  h1: ({ children }) => (
    <h3 className="text-[15px] font-bold mt-3 mb-1.5 font-['Playfair_Display',Georgia,serif] text-gray-900 dark:text-[#F5F1E8]">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h4 className="text-[14px] font-bold mt-2.5 mb-1 font-['Playfair_Display',Georgia,serif] text-gray-900 dark:text-[#F5F1E8]">
      {children}
    </h4>
  ),
  h3: ({ children }) => (
    <h5 className="text-[13px] font-semibold mt-2 mb-1 text-gray-900 dark:text-[#F5F1E8]">
      {children}
    </h5>
  ),

  // Paragraphs
  p: ({ children }) => (
    <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>
  ),

  // Bold & italic
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900 dark:text-[#F5F1E8]">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-[#4B2C5E] dark:text-[#C4A5D8]">{children}</em>
  ),

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#2F3E8F] dark:text-[#7B8FD4] underline underline-offset-2 hover:text-[#4B2C5E] dark:hover:text-[#C4A5D8] transition-colors"
    >
      {children}
    </a>
  ),

  // Lists
  ul: ({ children }) => (
    <ul className="list-disc list-outside pl-4 mb-1.5 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside pl-4 mb-1.5 space-y-0.5">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-3 border-[#C2A46D] dark:border-[#8B7355] pl-3 my-1.5 text-[#5C4A2E] dark:text-[#C2A46D] italic">
      {children}
    </blockquote>
  ),

  // Inline code
  code: ({ children, className }) => {
    // If it has a language class, it's a code block (handled by pre)
    if (className) {
      return <code className={className}>{children}</code>
    }
    return (
      <code className="bg-[#F6F2EA] dark:bg-[#2A241B] text-[#4B2C5E] dark:text-[#C4A5D8] px-1.5 py-0.5 rounded text-[12px] font-mono">
        {children}
      </code>
    )
  },

  // Code blocks
  pre: ({ children }) => (
    <pre className="bg-[#F6F2EA] dark:bg-[#1A1714] rounded-lg p-3 my-1.5 overflow-x-auto text-[12px] font-mono leading-relaxed border border-[#DDD6C8] dark:border-gray-700">
      {children}
    </pre>
  ),

  // Tables
  table: ({ children }) => (
    <div className="overflow-x-auto my-1.5 rounded-lg border border-[#C2A46D]/40 dark:border-[#8B7355]/40">
      <table className="w-full text-[12px] border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[#2F3E8F]/8 dark:bg-[#5A6BFF]/10">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-[#C2A46D]/20 dark:border-[#8B7355]/20 last:border-b-0">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-2.5 py-1.5 text-left font-semibold text-[#2F3E8F] dark:text-[#7B8FD4] whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2.5 py-1.5 text-gray-700 dark:text-gray-300">{children}</td>
  ),

  // Horizontal rule
  hr: () => (
    <hr className="my-2 border-[#C2A46D]/30 dark:border-[#8B7355]/30" />
  ),
}
