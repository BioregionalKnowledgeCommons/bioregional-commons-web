/**
 * Markdown chunking algorithm for vault-rag skill
 *
 * Splits markdown content by headings while preserving context.
 * Target chunk size: 500-1000 tokens (~2000-4000 characters)
 */

export interface ChunkData {
  index: number;
  content: string;
  metadata: {
    heading?: string;
    headingLevel?: number;
    headingPath?: string[];
    startLine?: number;
    endLine?: number;
  };
}

const MAX_CHUNK_CHARS = 4000;
const MIN_CHUNK_CHARS = 200;
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/gm;

/**
 * Chunk markdown content by headings
 */
export function chunk(content: string, filePath: string): ChunkData[] {
  const lines = content.split('\n');
  const chunks: ChunkData[] = [];
  const headingStack: string[] = [];

  let currentChunk: string[] = [];
  let currentHeading = '';
  let currentHeadingLevel = 0;
  let chunkStartLine = 0;
  let chunkIndex = 0;

  const flushChunk = (endLine: number) => {
    const text = currentChunk.join('\n').trim();
    if (text.length >= MIN_CHUNK_CHARS) {
      // If chunk is too large, split it
      if (text.length > MAX_CHUNK_CHARS) {
        const subChunks = splitLargeChunk(text);
        for (const subChunk of subChunks) {
          chunks.push({
            index: chunkIndex++,
            content: subChunk,
            metadata: {
              heading: currentHeading || undefined,
              headingLevel: currentHeadingLevel || undefined,
              headingPath: headingStack.length > 0 ? [...headingStack] : undefined,
              startLine: chunkStartLine,
              endLine,
            },
          });
        }
      } else {
        chunks.push({
          index: chunkIndex++,
          content: text,
          metadata: {
            heading: currentHeading || undefined,
            headingLevel: currentHeadingLevel || undefined,
            headingPath: headingStack.length > 0 ? [...headingStack] : undefined,
            startLine: chunkStartLine,
            endLine,
          },
        });
      }
    }
    currentChunk = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // Flush current chunk before starting new section
      if (currentChunk.length > 0) {
        flushChunk(i - 1);
      }

      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();

      // Update heading stack
      while (headingStack.length >= level) {
        headingStack.pop();
      }
      headingStack.push(headingText);

      currentHeading = headingText;
      currentHeadingLevel = level;
      chunkStartLine = i;
      currentChunk = [line];
    } else {
      currentChunk.push(line);
    }
  }

  // Flush remaining content
  if (currentChunk.length > 0) {
    flushChunk(lines.length - 1);
  }

  // Add file context to first chunk
  if (chunks.length > 0) {
    chunks[0].content = `File: ${filePath}\n\n${chunks[0].content}`;
  }

  return chunks;
}

/**
 * Split a large chunk into smaller pieces at paragraph boundaries
 */
function splitLargeChunk(text: string): string[] {
  const paragraphs = text.split(/\n\n+/);
  const subChunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > MAX_CHUNK_CHARS) {
      if (current.length >= MIN_CHUNK_CHARS) {
        subChunks.push(current.trim());
        current = para;
      } else {
        // Paragraph itself is too long, split by sentences
        const sentences = splitBySentences(para);
        for (const sentence of sentences) {
          if ((current + ' ' + sentence).length > MAX_CHUNK_CHARS) {
            if (current.length >= MIN_CHUNK_CHARS) {
              subChunks.push(current.trim());
            }
            current = sentence;
          } else {
            current = current ? current + ' ' + sentence : sentence;
          }
        }
      }
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }

  if (current.length >= MIN_CHUNK_CHARS) {
    subChunks.push(current.trim());
  }

  return subChunks;
}

/**
 * Split text by sentence boundaries
 */
function splitBySentences(text: string): string[] {
  // Simple sentence splitter - handles most common cases
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 0);
}

/**
 * Extract frontmatter from markdown content
 */
export function extractFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  content: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return { frontmatter: {}, content };
  }

  try {
    // Simple YAML parsing for common frontmatter
    const frontmatter: Record<string, unknown> = {};
    const lines = match[1].split('\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        let value: unknown = line.slice(colonIndex + 1).trim();

        // Parse arrays
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value
            .slice(1, -1)
            .split(',')
            .map((s) => s.trim().replace(/^["']|["']$/g, ''));
        }
        // Parse booleans
        else if (value === 'true') value = true;
        else if (value === 'false') value = false;
        // Parse numbers
        else if (!isNaN(Number(value))) value = Number(value);
        // Remove quotes from strings
        else value = value.replace(/^["']|["']$/g, '');

        frontmatter[key] = value;
      }
    }

    return { frontmatter, content: match[2] };
  } catch {
    return { frontmatter: {}, content };
  }
}
