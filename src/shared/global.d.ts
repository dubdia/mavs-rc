// Required to imports assets
declare module "*.png";

// Declare every module that ends with "?raw" as a string module.
declare module "*?raw" {
  const content: string;
  export default content;
}
