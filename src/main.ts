import App from "./App.svelte";
import toNumeral from "./numeral";
import getPrimes from "./primes";

const numbers = getPrimes(2000);
const numerals = numbers.map(toNumeral);

const app = new App({
  target: document.body,
  props: {
    numbers,
    numerals,
  },
});

export default app;
