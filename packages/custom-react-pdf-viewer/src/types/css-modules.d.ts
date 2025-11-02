// This file tells TypeScript that importing a .module.css file
// will return an object with string keys and string values.
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}