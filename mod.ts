export const getUseDirective = async (
  stream: ReadableStream<Uint8Array>,
): Promise<"client" | "server" | "default"> => {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  const directives = {
    "use client": "client",
    "use server": "server",
  } as const;

  let buffer = "";
  let inMultilineComment = false;
  let inSingleLineComment = false;
  let nonWhitespaceEncountered = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let i = 0;

      while (i < buffer.length) {
        // Check for multi-line comment start
        if (
          !inMultilineComment && !inSingleLineComment &&
          buffer[i] === "/" && buffer[i + 1] === "*"
        ) {
          inMultilineComment = true;
          i += 2;
          continue;
        }

        // Check for multi-line comment end
        if (inMultilineComment && buffer[i] === "*" && buffer[i + 1] === "/") {
          inMultilineComment = false;
          i += 2;
          continue;
        }

        // Check for single-line comment
        if (
          !inMultilineComment && !inSingleLineComment &&
          buffer[i] === "/" && buffer[i + 1] === "/"
        ) {
          inSingleLineComment = true;
          i += 2;
          continue;
        }

        // Check for single-line comment end
        if (inSingleLineComment && (buffer[i] === "\n" || buffer[i] === "\r")) {
          inSingleLineComment = false;
          i++;
          continue;
        }

        // Skip all characters in comments
        if (inMultilineComment || inSingleLineComment) {
          i++;
          continue;
        }

        // Skip whitespace
        if (/\s/.test(buffer[i])) {
          i++;
          continue;
        }

        // Check if it's the start of a directive string
        if (buffer[i] === '"' || buffer[i] === "'") {
          const quoteChar = buffer[i];
          const startIndex = i + 1;
          const endIndex = buffer.indexOf(quoteChar, startIndex);

          if (endIndex !== -1) {
            const content = buffer.slice(startIndex, endIndex);
            if (content in directives && !nonWhitespaceEncountered) {
              return directives[content as keyof typeof directives];
            }
            // If we found a string but it's not a directive or we've seen other code,
            // we mark that we've encountered non-whitespace content
            nonWhitespaceEncountered = true;
            i = endIndex + 1;
            continue;
          }
        }

        // We've found a non-whitespace, non-comment, non-string character
        nonWhitespaceEncountered = true;

        // If we reach here with a non-whitespace character, it's likely not a directive
        // or we're still parsing the file
        i++;
      }

      // If we've found significant content that's not a directive, we can return default
      if (nonWhitespaceEncountered) {
        return "default";
      }

      // Clear buffer after processing, but keep any partial content
      buffer = buffer.slice(i);
    }

    return "default";
  } finally {
    reader.releaseLock();
  }
};

export default getUseDirective;
