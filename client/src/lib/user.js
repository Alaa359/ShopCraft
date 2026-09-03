// Aide pour afficher un avatar par défaut : les initiales du nom.
// Renvoie la première lettre du prénom et la première lettre du nom
// (ex. "Alaa Ben Romdhane" -> "AR", "Alaa" -> "A").
export function getInitials(name, email) {
  const source = (name ?? '').trim() || (email ? email.split('@')[0] : '');
  if (!source) return 'U';
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}
