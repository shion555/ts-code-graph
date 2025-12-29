import { greet, add } from "./sample.js";

export function sayHello(name: string): string {
  return greet(name);
}

export const calculate = (a: number, b: number): number => {
  return add(a, b);
};
