const pt = {
  "base.appName": "Estante",
  "base.cancel": "Cancelar",
  "base.save": "Salvar",
  "base.retry": "Tentar de novo",
  "base.friends.readOne": "{name} já leu",
  "base.friends.readChip_one": "{count} amigo leu",
  "base.friends.readChip_other": "{count} amigos leram",
} as const;

const en: Record<keyof typeof pt, string> = {
  "base.appName": "Estante",
  "base.cancel": "Cancel",
  "base.save": "Save",
  "base.retry": "Try again",
  "base.friends.readOne": "{name} has read it",
  "base.friends.readChip_one": "{count} friend read it",
  "base.friends.readChip_other": "{count} friends read it",
};

const es: Record<keyof typeof pt, string> = {
  "base.appName": "Estante",
  "base.cancel": "Cancelar",
  "base.save": "Guardar",
  "base.retry": "Intentar de nuevo",
  "base.friends.readOne": "{name} ya lo leyó",
  "base.friends.readChip_one": "{count} amigo lo leyó",
  "base.friends.readChip_other": "{count} amigos lo leyeron",
};

export const base = { pt, en, es };
