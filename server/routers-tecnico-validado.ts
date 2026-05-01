// Validações robustas para criação de técnico
// Este arquivo contém as validações que devem ser aplicadas ao criar técnicos

export const tecnicoCreateValidations = {
  // Validar senha
  validateSenha: (senha: string): { valid: boolean; error?: string } => {
    if (!senha) return { valid: false, error: "Senha é obrigatória" };
    if (senha.length < 6) return { valid: false, error: "Senha deve ter no mínimo 6 caracteres" };
    if (senha.trim().length === 0) return { valid: false, error: "Senha não pode conter apenas espaços" };
    return { valid: true };
  },

  // Validar email
  validateEmail: (email: string): { valid: boolean; error?: string } => {
    if (!email) return { valid: false, error: "Email é obrigatório" };
    if (!email.includes("@")) return { valid: false, error: "Email inválido" };
    if (email.length < 5) return { valid: false, error: "Email muito curto" };
    return { valid: true };
  },

  // Validar nome
  validateNome: (nome: string): { valid: boolean; error?: string } => {
    if (!nome) return { valid: false, error: "Nome é obrigatório" };
    if (nome.length < 2) return { valid: false, error: "Nome deve ter no mínimo 2 caracteres" };
    if (nome.trim().length === 0) return { valid: false, error: "Nome não pode conter apenas espaços" };
    return { valid: true };
  },

  // Validar hash bcrypt
  validateHash: (hash: string): { valid: boolean; error?: string } => {
    if (!hash) return { valid: false, error: "Hash não foi gerado" };
    if (hash.length < 50) return { valid: false, error: "Hash inválido (muito curto)" };
    if (!hash.startsWith("$2a$") && !hash.startsWith("$2b$") && !hash.startsWith("$2y$")) {
      return { valid: false, error: "Hash não é válido bcrypt" };
    }
    return { valid: true };
  },
};
