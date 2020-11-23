<script lang="ts">
  export let numbers: number[];
  export let numerals: string[];

  const comma = "%2C";
  const enter = "%0A";

  export const generateCsvText = (rows: { num: number; numeral: string }[]) => {
    const lines = rows.map(({ num, numeral }) =>
      [num, numeral, numeral.length].join(comma),
    );
    const text = lines.join(enter);
    return text;
  };

  export const sortingOptions = ["number", "numeral length"] as const;

  type Sorting = typeof sortingOptions[number];

  const getRows = () =>
    numbers.map((num, i) => {
      const numeral = numerals[i];
      return { num, numeral };
    });

  const getLengthSortedRows = () =>
    getRows().sort((a, b) => a.numeral.length - b.numeral.length);

  const getSortedRows = (sorting: Sorting) => {
    if (sorting === "number") {
      return getRows();
    }
    return getLengthSortedRows();
  };

  export let rows = getRows();
  export const handleInput = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    const sorting = target.value as Sorting;
    rows = getSortedRows(sorting);
  };
</script>

<style lang="scss">
  table {
    font-family: monospace;
    font-size: 16px;
    tr:nth-child(even) {
      background-color: #eee;
    }
    td {
      width: 20px;
    }
  }
</style>

<main>
  <div>
    Sort by
    <select on:input={handleInput}>
      {#each sortingOptions as opt}
        <option value={opt}>{opt}</option>
      {/each}
    </select>
  </div>

  <div>
    <a
      href={`data:application/octet-stream,${generateCsvText(rows)}`}
      download="roman.csv">Download</a>
  </div>

  <div>

    <table>
      <tr>
        <th>Number</th>
        <th>Numeral</th>
        <th>Numeral length</th>
      </tr>
      {#each rows as row}
      <tr>
        <td>{row.num}</td>
        <td>{row.numeral}</td>
        <td>{row.numeral.length}</td>
      </tr>
      {/each}
    </table>
</main>
