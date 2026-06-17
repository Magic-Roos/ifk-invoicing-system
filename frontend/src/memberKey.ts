// Beräknar en stabil grupperingsnyckel per medlem.
//
// Eventor använder Person-id "0" (och ibland tomt/null) som platshållare för
// löpare som saknar Eventor-id, t.ex. gäster och oregistrerade. Flera olika
// personer kan alltså dela id "0". Att gruppera direkt på Person-id slår då
// ihop dem till en enda medlem. Därför faller vi tillbaka på namnet när id
// saknas eller är "0".
export const getMemberKey = (
  personId: string | number | null | undefined,
  memberName: string
): string => {
  const id =
    personId === null || personId === undefined ? '' : String(personId).trim();
  if (id === '' || id === '0') {
    return memberName;
  }
  return id;
};
