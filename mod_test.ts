import { assertEquals } from "jsr:@std/assert";
import { getUseDirective } from "./mod.ts";

const createStreamFromString = (str: string): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(str));
      controller.close();
    },
  });
};

Deno.test("getUseDirective - basic client directive", async () => {
  const stream = createStreamFromString(`"use client"`);
  const result = await getUseDirective(stream);
  assertEquals(result, "client");
});

Deno.test("getUseDirective - basic server directive", async () => {
  const stream = createStreamFromString(`"use server"`);
  const result = await getUseDirective(stream);
  assertEquals(result, "server");
});

Deno.test("getUseDirective - single quotes client directive", async () => {
  const stream = createStreamFromString(`'use client'`);
  const result = await getUseDirective(stream);
  assertEquals(result, "client");
});

Deno.test("getUseDirective - whitespace before directive", async () => {
  const stream = createStreamFromString(`   
      "use client"`);
  const result = await getUseDirective(stream);
  assertEquals(result, "client");
});

Deno.test("getUseDirective - single-line comment before directive", async () => {
  const stream = createStreamFromString(`// This is a comment
      "use client"`);
  const result = await getUseDirective(stream);
  assertEquals(result, "client");
});

Deno.test("getUseDirective - multi-line comment before directive", async () => {
  const stream = createStreamFromString(`/* This is a 
      multi-line comment */
      "use server"`);
  const result = await getUseDirective(stream);
  assertEquals(result, "server");
});

Deno.test("getUseDirective - mixed comments and whitespace", async () => {
  const stream = createStreamFromString(`  
      // First comment
      /* Second comment */   
      
      // Another comment
      "use client"`);
  const result = await getUseDirective(stream);
  assertEquals(result, "client");
});

Deno.test("getUseDirective - non-directive content first", async () => {
  const stream = createStreamFromString(`const x = 5;
      "use client"`);
  const result = await getUseDirective(stream);
  assertEquals(result, "default");
});

Deno.test("getUseDirective - directive-like content in comments", async () => {
  const stream = createStreamFromString(`// "use client"
      /* "use server" */
      const x = 5;`);
  const result = await getUseDirective(stream);
  assertEquals(result, "default");
});

Deno.test("getUseDirective - directive-like content but not exact match", async () => {
  const stream = createStreamFromString(`"use clientside"`);
  const result = await getUseDirective(stream);
  assertEquals(result, "default");
});

Deno.test("getUseDirective - no directive at all", async () => {
  const stream = createStreamFromString(`function test() {
      return "Hello world";
    }`);
  const result = await getUseDirective(stream);
  assertEquals(result, "default");
});

Deno.test("getUseDirective - nested comments", async () => {
  const stream = createStreamFromString(
    `// Comment with /* nested comment syntax */
      "use server"`,
  );
  const result = await getUseDirective(stream);
  assertEquals(result, "server");
});

Deno.test("getUseDirective - comment after directive", async () => {
  const stream = createStreamFromString(
    `"use client" // This is a client component`,
  );
  const result = await getUseDirective(stream);
  assertEquals(result, "client");
});

Deno.test("getUseDirective - blank file", async () => {
  const stream = createStreamFromString(``);
  const result = await getUseDirective(stream);
  assertEquals(result, "default");
});

Deno.test("getUseDirective - only whitespace", async () => {
  const stream = createStreamFromString(`   
      
    `);
  const result = await getUseDirective(stream);
  assertEquals(result, "default");
});

Deno.test("getUseDirective - only comments", async () => {
  const stream = createStreamFromString(`// Just a comment
      /* Another comment */`);
  const result = await getUseDirective(stream);
  assertEquals(result, "default");
});

Deno.test("getUseDirective - string before directive", async () => {
  const stream = createStreamFromString(`"Some other string"
      "use client"`);
  const result = await getUseDirective(stream);
  assertEquals(result, "default");
});

Deno.test("getUseDirective - directive after code", async () => {
  const stream = createStreamFromString(`console.log("Hello");
      "use server"`);
  const result = await getUseDirective(stream);
  assertEquals(result, "default");
});
