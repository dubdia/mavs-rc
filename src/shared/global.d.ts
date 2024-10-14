/** Required to imports assets */
declare module "*.png";

/** declare every module that ends with "?raw" as a string module. */
declare module "*?raw" {
  const content: string;
  export default content;
}

// In a global.d.ts file or at the top of a TypeScript file
declare module '*?raw' {
  const content: string;
  export default content;
}