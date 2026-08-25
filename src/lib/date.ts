const YEAR_PATTERN = /^\d{4}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeDateInput(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function isValidFamilyDate(value: string | undefined): boolean {
  if (!value) return true;
  if (YEAR_PATTERN.test(value)) {
    const year = Number(value);
    return year >= 1 && year <= 9999;
  }
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function comparableDate(value: string | undefined): number | undefined {
  if (!value) return undefined;
  if (YEAR_PATTERN.test(value)) return Number(value) * 10_000;
  if (DATE_PATTERN.test(value)) return Number(value.replaceAll('-', ''));
  return undefined;
}

export function validateLifeDates(
  birthDate: string | undefined,
  deathDate: string | undefined,
): string | null {
  if (!isValidFamilyDate(birthDate)) return 'Birth must be a year (YYYY) or date (YYYY-MM-DD).';
  if (!isValidFamilyDate(deathDate)) return 'Death must be a year (YYYY) or date (YYYY-MM-DD).';

  const birth = comparableDate(birthDate);
  const death = comparableDate(deathDate);
  if (birth !== undefined && death !== undefined && death < birth) {
    return 'Death cannot be before birth.';
  }
  return null;
}

export function yearFromFamilyDate(value?: string): string | undefined {
  if (!value) return undefined;
  return value.slice(0, 4);
}

function dateParts(value: string): { year: number; month?: number; day?: number } | null {
  if (YEAR_PATTERN.test(value)) {
    return { year: Number(value) };
  }
  if (!DATE_PATTERN.test(value)) return null;
  const [yearPart, monthPart, dayPart] = value.split('-');
  if (!yearPart || !monthPart || !dayPart) return null;
  return {
    year: Number(yearPart),
    month: Number(monthPart),
    day: Number(dayPart),
  };
}

export function calculateAgeYears(
  birthDate?: string,
  deathDate?: string,
  today = new Date(),
): number | undefined {
  if (!birthDate) return undefined;
  const birth = dateParts(birthDate);
  if (!birth) return undefined;

  const end = deathDate ? dateParts(deathDate) : {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
  if (!end || end.year < birth.year) return undefined;

  let age = end.year - birth.year;
  if (
    birth.month !== undefined &&
    birth.day !== undefined &&
    end.month !== undefined &&
    end.day !== undefined &&
    (end.month < birth.month || (end.month === birth.month && end.day < birth.day))
  ) {
    age -= 1;
  }

  return age >= 0 ? age : undefined;
}

export function displayLifeSpan(birthDate?: string, deathDate?: string): string {
  const birthYear = yearFromFamilyDate(birthDate);
  const deathYear = yearFromFamilyDate(deathDate);
  if (!birthYear && !deathYear) return 'Dates not added';
  if (!birthYear) return `? – ${deathYear}`;
  return `${birthYear} – ${deathYear ?? 'Present'}`;
}

export function displayAge(birthDate?: string, deathDate?: string): string | undefined {
  const age = calculateAgeYears(birthDate, deathDate);
  if (age === undefined) return undefined;
  return `${age} ${age === 1 ? 'year' : 'years'}`;
}

export function displayLifeSummary(birthDate?: string, deathDate?: string): string {
  const age = displayAge(birthDate, deathDate);
  const span = displayLifeSpan(birthDate, deathDate);
  return age ? `${age} · ${span}` : span;
}
