async function main(): Promise<void> {
  console.log(
    JSON.stringify(
      {
        ok: true,
        deleted: [],
        message:
          'roles:delete is retired. All previous level role IDs are active in the 20-band mapping. Use npm run roles:apply to rename/recolor them.'
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
