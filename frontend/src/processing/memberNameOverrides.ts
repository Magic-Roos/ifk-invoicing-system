// Namnöverskrivningar för medlemmar, nyckel = Person-id (Eventor).
//
// Bakgrund: när två medlemmar har exakt samma namn (t.ex. två "Jenny
// Johansson") kan mottagande system (Fortnox) inte skilja dem åt. Här mappar
// vi Person-id till ett unikt visningsnamn så att fakturaunderlaget blir
// entydigt. Vi matchar på Person-id istället för födelseår eftersom id:t är
// stabilt och garanterat unikt per person.
//
// Lägg till en rad per person som behöver särskiljas.
const MEMBER_NAME_OVERRIDES: Record<string, string> = {
  '1879': 'Jenny 77 Johansson', // f. 1977
  '22335': 'Jenny 76 Johansson', // f. 1976
};

// Returnerar det överskrivna namnet om Person-id finns i tabellen, annars
// originalnamnet oförändrat.
export const applyMemberNameOverride = (
  personId: string | number | null | undefined,
  fallbackName: string
): string => {
  const id =
    personId === null || personId === undefined ? '' : String(personId).trim();
  if (id === '' || id === '0') {
    return fallbackName;
  }
  return MEMBER_NAME_OVERRIDES[id] ?? fallbackName;
};
