export function formatExp(value: bigint | number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function buildProgressBar(current: bigint | number, required: bigint | number, size = 10): string {
  const currentNumber = Number(current);
  const requiredNumber = Number(required);
  const ratio = requiredNumber <= 0 ? 0 : Math.max(0, Math.min(1, currentNumber / requiredNumber));
  const filled = Math.round(ratio * size);
  const empty = size - filled;

  return `${'█'.repeat(filled)}${'░'.repeat(empty)}`;
}

export function getProgressPercent(current: bigint | number, required: bigint | number): number {
  const currentNumber = Number(current);
  const requiredNumber = Number(required);

  if (requiredNumber <= 0) {
    return 0;
  }

  return Math.round(Math.max(0, Math.min(1, currentNumber / requiredNumber)) * 100);
}

export function formatDiscordTimestamp(date: Date | null | undefined): string {
  if (!date) {
    return '-';
  }

  return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}

