const isPrime = (x: number) => {
  let factors = 0;
  for (let n = 1; n <= x; n++) {
    if (x % n === 0) {
      factors++;
    }
    if (factors > 2) {
      return false;
    }
  }
  return true;
};

const getPrimes = (max: number): number[] => {
  const primes: number[] = [];
  for (let n = 1; n < max; n++) {
    if (isPrime(n)) {
      primes.push(n);
    }
  }
  return primes;
};

export default getPrimes;
