const PROJECTS_URL = "./projects.json";
const STORAGE_UNLOCKED_KEY = "dc-portal-unlocked-v1";
const STORAGE_CUSTOM_KEY = "dc-portal-custom-projects-v1";
const STORAGE_OVERRIDES_KEY = "dc-portal-overrides-v1";

const VALID_CATEGORIES = new Set(["dev", "ia", "deploy", "cloud", "social", "dashboard"]);
const CATEGORY_LABELS = { dev: "Dev", ia: "IA", deploy: "Deploy", cloud: "Cloud", social: "Social", dashboard: "Dashboard" };

const searchInput = document.getElementById("searchInput");
const grid = document.getElementById("projectsGrid");
const emptyState = document.getElementById("emptyState");

const statTotal = document.getElementById("statTotal");
const statPublic = document.getElementById("statPublic");
const statRestricted = document.getElementById("statRestricted");
const statUnlocked = document.getElementById("statUnlocked");

const settingsToggleBtn = document.getElementById("settingsToggleBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const settingsBackdrop = document.getElementById("settingsBackdrop");
const openCreateDialogBtn = document.getElementById("openCreateDialogBtn");
const clearUnlocksBtn = document.getElementById("clearUnlocksBtn");
const settingsTotalProjects = document.getElementById("settingsTotalProjects");
const settingsRestrictedProjects = document.getElementById("settingsRestrictedProjects");

const projectDialog = document.getElementById("projectDialog");
const projectForm = document.getElementById("projectForm");
const projectDialogTitle = document.getElementById("projectDialogTitle");
const projectDialogMessage = document.getElementById("projectDialogMessage");
const projectUrlInput = document.getElementById("projectUrl");
const projectNameInput = document.getElementById("projectName");
const projectDescriptionInput = document.getElementById("projectDescription");
const projectVisibilityInput = document.getElementById("projectVisibility");
const projectTagsInput = document.getElementById("projectTags");
const projectPasswordInput = document.getElementById("projectPassword");
const projectPasswordHintInput = document.getElementById("projectPasswordHint");
const restrictedFields = document.getElementById("restrictedFields");
const autoFillBtn = document.getElementById("autoFillBtn");
const cancelProjectBtn = document.getElementById("cancelProjectBtn");
const deleteProjectBtn = document.getElementById("deleteProjectBtn");

const passwordDialog = document.getElementById("passwordDialog");
const passwordForm = document.getElementById("passwordForm");
const passwordInput = document.getElementById("passwordInput");
const passwordProjectName = document.getElementById("passwordProjectName");
const passwordHint = document.getElementById("passwordHint");
const passwordError = document.getElementById("passwordError");
const cancelPasswordBtn = document.getElementById("cancelPasswordBtn");
const projectCategoryInput = document.getElementById("projectCategory");
const exportProjectsBtn = document.getElementById("exportProjectsBtn");
const importProjectsBtn = document.getElementById("importProjectsBtn");
const importFileInput = document.getElementById("importFileInput");
const toastEl = document.getElementById("toast");

let baseProjects = [];
let customProjects = [];
let projectOverrides = {};

let currentFilter = "all";
let currentCategoryFilter = "all";
let currentLockedProject = null;
let editingContext = null;
let settingsOpen = false;
let toastTimer = null;

const unlockedProjects = new Set(readUnlockedProjects());

start();

async function start() {
  try {
    const response = await fetch(PROJECTS_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Falha ao carregar projects.json (${response.status})`);
    }

    baseProjects = sanitizeProjectList(await response.json(), "base");
    customProjects = sanitizeProjectList(readStorage(STORAGE_CUSTOM_KEY, []), "custom");
    projectOverrides = readStorage(STORAGE_OVERRIDES_KEY, {});

    wireEvents();
    toggleRestrictedFields();
    render();
  } catch (error) {
    grid.innerHTML = `<p class="empty">Erro ao carregar projetos: ${escapeHtml(error.message)}</p>`;
  }
}

function wireEvents() {
  searchInput.addEventListener("input", render);

  document.querySelectorAll(".filter").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentFilter = button.dataset.filter;
      render();
    });
  });

  settingsToggleBtn.addEventListener("click", toggleSettingsPanel);
  closeSettingsBtn.addEventListener("click", closeSettingsPanel);
  settingsBackdrop.addEventListener("click", closeSettingsPanel);
  openCreateDialogBtn.addEventListener("click", () => openProjectDialog("create"));
  clearUnlocksBtn.addEventListener("click", clearUnlocks);
  exportProjectsBtn.addEventListener("click", exportProjects);
  importProjectsBtn.addEventListener("click", () => importFileInput.click());
  importFileInput.addEventListener("change", onImportFile);

  document.querySelectorAll(".cat-filter").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".cat-filter").forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentCategoryFilter = button.dataset.category;
      render();
    });
  });

  projectVisibilityInput.addEventListener("change", toggleRestrictedFields);
  autoFillBtn.addEventListener("click", () => autoFillFromUrl(true));
  projectUrlInput.addEventListener("blur", () => autoFillFromUrl(false));
  projectForm.addEventListener("submit", onSaveProject);
  cancelProjectBtn.addEventListener("click", closeProjectDialog);
  deleteProjectBtn.addEventListener("click", onDeleteProject);

  passwordForm.addEventListener("submit", onSubmitPassword);
  cancelPasswordBtn.addEventListener("click", closePasswordDialog);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && settingsOpen) closeSettingsPanel();
  });
}

function render() {
  const projects = buildProjects();
  const term = normalize(searchInput.value);

  const filtered = projects.filter((project) => {
    const visibleByFilter = matchFilter(project);
    const searchText = `${project.name} ${project.description} ${project.url} ${(project.tags || []).join(" ")}`;
    const visibleBySearch = normalize(searchText).includes(term);
    return visibleByFilter && visibleBySearch;
  });

  grid.innerHTML = "";

  filtered.forEach((project) => {
    const card = document.createElement("article");
    card.className = "card";

    const restricted = project.visibility === "restricted";
    const unlocked = unlockedProjects.has(project.id);

    const visibilityBadge = restricted
      ? `<span class="badge restricted">RESTRITO</span>`
      : `<span class="badge public">PUBLICO</span>`;

    const lockBadge = restricted && !unlocked ? `<span class="badge locked">BLOQUEADO</span>` : "";
    const customBadge = project.source === "custom" ? `<span class="badge custom">PERSONALIZADO</span>` : "";
    const categoryBadge = project.category
      ? `<span class="badge cat-${escapeHtml(project.category)}">${escapeHtml(CATEGORY_LABELS[project.category] || project.category)}</span>`
      : "";

    card.innerHTML = `
      <div class="card-header">
        <img class="favicon" src="${escapeHtml(faviconFromUrl(project.url))}" alt="icone do projeto" loading="lazy" />
        <div>
          <h3>${escapeHtml(project.name)}</h3>
          <div class="domain">${escapeHtml(extractDomain(project.url))}</div>
        </div>
      </div>

      <div class="meta">
        ${visibilityBadge}
        ${categoryBadge}
        ${lockBadge}
        ${customBadge}
      </div>

      <p class="desc">${escapeHtml(project.description || "Sem descricao")}</p>

      <div class="tags">${(project.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>

      <div class="footer">
        <span class="date">Atualizado: ${formatDate(project.updatedAt)}</span>
        <div class="card-actions">
          <button class="open-btn" type="button">${restricted && !unlocked ? "Desbloquear" : "Acessar"}</button>
          <button class="copy-btn" type="button">Copiar</button>
          <button class="edit-btn" type="button">Editar</button>
          ${project.source === "custom" ? `<button class="delete-btn" type="button">Remover</button>` : `<span class="delete-placeholder" aria-hidden="true"></span>`}
        </div>
      </div>
    `;

    card.querySelector(".open-btn")?.addEventListener("click", () => openProject(project));
    card.querySelector(".copy-btn")?.addEventListener("click", () => {
      navigator.clipboard.writeText(project.url).then(() => showToast("Link copiado!"));
    });
    card.querySelector(".edit-btn")?.addEventListener("click", () => openProjectDialog("edit", project));
    card.querySelector(".delete-btn")?.addEventListener("click", () => removeCustomProject(project.id));

    grid.appendChild(card);
  });

  emptyState.hidden = filtered.length > 0;
  updateStats(projects);
}

function updateStats(projects) {
  const total = projects.length;
  const publicCount = projects.filter((project) => project.visibility !== "restricted").length;
  const restrictedCount = total - publicCount;
  const unlockedCount = projects.filter(
    (project) => project.visibility === "restricted" && unlockedProjects.has(project.id),
  ).length;

  statTotal.textContent = String(total);
  statPublic.textContent = String(publicCount);
  statRestricted.textContent = String(restrictedCount);
  statUnlocked.textContent = String(unlockedCount);

  settingsTotalProjects.textContent = String(total);
  settingsRestrictedProjects.textContent = String(restrictedCount);
}

function buildProjects() {
  const map = new Map();

  baseProjects.forEach((baseProject) => {
    const override = projectOverrides[baseProject.id] || {};
    map.set(baseProject.id, sanitizeProject({ ...baseProject, ...override, source: "base" }, "base"));
  });

  customProjects.forEach((customProject) => {
    map.set(customProject.id, sanitizeProject({ ...customProject, source: "custom" }, "custom"));
  });

  return [...map.values()].sort((left, right) => {
    if (left.updatedAt === right.updatedAt) {
      return left.name.localeCompare(right.name, "pt-BR");
    }
    return String(right.updatedAt).localeCompare(String(left.updatedAt));
  });
}

function matchFilter(project) {
  const restricted = project.visibility === "restricted";

  const matchesVisibility = (() => {
    if (currentFilter === "all") return true;
    if (currentFilter === "public") return !restricted;
    if (currentFilter === "restricted") return restricted;
    if (currentFilter === "unlocked") return restricted && unlockedProjects.has(project.id);
    return true;
  })();

  const matchesCategory = currentCategoryFilter === "all" || project.category === currentCategoryFilter;

  return matchesVisibility && matchesCategory;
}

function openProject(project) {
  const restricted = project.visibility === "restricted";
  const unlocked = unlockedProjects.has(project.id);

  if (!restricted || unlocked) {
    window.open(project.url, "_blank", "noopener,noreferrer");
    return;
  }

  currentLockedProject = project;
  passwordProjectName.textContent = `Projeto: ${project.name}`;
  passwordHint.textContent = project.passwordHint ? `Dica: ${project.passwordHint}` : "";
  passwordError.textContent = "";
  passwordInput.value = "";
  passwordDialog.showModal();
  passwordInput.focus();
}

async function onSubmitPassword(event) {
  event.preventDefault();

  if (!currentLockedProject) return;

  const typedPassword = passwordInput.value;
  const valid = await checkProjectPassword(currentLockedProject, typedPassword);

  if (!valid) {
    passwordError.textContent = "Senha invalida.";
    return;
  }

  unlockedProjects.add(currentLockedProject.id);
  persistUnlockedProjects([...unlockedProjects]);

  const targetUrl = currentLockedProject.url;
  closePasswordDialog();
  render();
  window.open(targetUrl, "_blank", "noopener,noreferrer");
}

async function checkProjectPassword(project, typedPassword) {
  if (project.passwordSha256) {
    return (await sha256(typedPassword)) === project.passwordSha256;
  }

  if (project.password) {
    return typedPassword === String(project.password);
  }

  return false;
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function openProjectDialog(mode, project = null) {
  if (mode === "edit" && project) {
    editingContext = { id: project.id, source: project.source };
    projectDialogTitle.textContent = `Editar: ${project.name}`;
    projectUrlInput.value = project.url || "";
    projectNameInput.value = project.name || "";
    projectDescriptionInput.value = project.description || "";
    projectVisibilityInput.value = project.visibility || "public";
    projectCategoryInput.value = project.category || "";
    projectTagsInput.value = (project.tags || []).join(", ");
    projectPasswordInput.value = "";
    projectPasswordHintInput.value = project.passwordHint || "";
    deleteProjectBtn.hidden = project.source !== "custom";
  } else {
    editingContext = null;
    projectDialogTitle.textContent = "Incluir projeto";
    projectForm.reset();
    projectVisibilityInput.value = "public";
    projectCategoryInput.value = "";
    deleteProjectBtn.hidden = true;
    projectUrlInput.value = "";
    projectNameInput.value = "";
    projectDescriptionInput.value = "";
    projectTagsInput.value = "";
    projectPasswordHintInput.value = "";
  }

  toggleRestrictedFields();
  setProjectDialogMessage("", false);
  projectDialog.showModal();
  projectUrlInput.focus();
}

function closeProjectDialog() {
  projectDialog.close();
  editingContext = null;
  setProjectDialogMessage("", false);
}

function toggleRestrictedFields() {
  restrictedFields.hidden = projectVisibilityInput.value !== "restricted";
}

function autoFillFromUrl(forceFill) {
  const parsedUrl = parseUrl(projectUrlInput.value);

  if (!parsedUrl) {
    if (forceFill) setProjectDialogMessage("Informe uma URL valida para preencher automaticamente.", true);
    return;
  }

  projectUrlInput.value = parsedUrl.href;
  const suggestion = deriveFromUrl(parsedUrl);

  if (forceFill || !projectNameInput.value.trim()) projectNameInput.value = suggestion.name;
  if (forceFill || !projectDescriptionInput.value.trim()) projectDescriptionInput.value = suggestion.description;
  if (forceFill || !projectTagsInput.value.trim()) projectTagsInput.value = suggestion.tags.join(", ");

  if (forceFill) setProjectDialogMessage("Campos sugeridos a partir da URL.", false);
}

function deriveFromUrl(parsedUrl) {
  const hostname = parsedUrl.hostname.replace(/^www\./, "");
  const hostPrimary = hostname.split(".")[0] || "projeto";
  const pathPrimary = parsedUrl.pathname.split("/").filter(Boolean)[0] || "";

  const nameParts = `${hostPrimary} ${pathPrimary}`
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const name = nameParts.length > 0 ? nameParts.map(capitalizeWord).join(" ") : "Novo Projeto";

  const tags = [hostPrimary, pathPrimary, "dashboard"]
    .map((value) => normalize(value))
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .slice(0, 4);

  return {
    name,
    description: `Acesso ao projeto hospedado em ${hostname}.`,
    tags,
  };
}

function onSaveProject(event) {
  event.preventDefault();

  const parsedUrl = parseUrl(projectUrlInput.value);
  if (!parsedUrl) {
    setProjectDialogMessage("URL invalida.", true);
    return;
  }

  const name = projectNameInput.value.trim();
  if (!name) {
    setProjectDialogMessage("Informe um nome para o projeto.", true);
    return;
  }

  const visibility = projectVisibilityInput.value === "restricted" ? "restricted" : "public";
  const currentProject = editingContext ? findProjectById(editingContext.id, editingContext.source) : null;

  const selectedCategory = projectCategoryInput.value;

  const payload = {
    name,
    description: projectDescriptionInput.value.trim() || `Acesso ao projeto ${name}.`,
    url: parsedUrl.href,
    visibility,
    tags: parseTags(projectTagsInput.value),
    updatedAt: todayISO(),
  };

  if (selectedCategory && VALID_CATEGORIES.has(selectedCategory)) {
    payload.category = selectedCategory;
  }

  if (visibility === "restricted") {
    const typedPassword = projectPasswordInput.value;
    const existingPassword = currentProject?.password || "";
    const existingHash = currentProject?.passwordSha256 || "";

    if (!typedPassword && !existingPassword && !existingHash) {
      setProjectDialogMessage("Projeto restrito exige senha.", true);
      return;
    }

    if (typedPassword) {
      payload.password = typedPassword;
      delete payload.passwordSha256;
    } else if (existingHash) {
      payload.passwordSha256 = existingHash;
    } else {
      payload.password = existingPassword;
    }

    const hintValue = projectPasswordHintInput.value.trim();
    if (hintValue) payload.passwordHint = hintValue;
    else if (currentProject?.passwordHint) payload.passwordHint = currentProject.passwordHint;
  }

  if (visibility === "public") {
    delete payload.password;
    delete payload.passwordSha256;
    delete payload.passwordHint;
  }

  if (editingContext) {
    applyProjectUpdate(editingContext, payload);
  } else {
    const newProject = {
      ...payload,
      id: createUniqueProjectId(payload.url, payload.name),
      source: "custom",
    };

    customProjects.push(newProject);
    persistCustomProjects();
  }

  closeProjectDialog();
  render();
}

function onDeleteProject() {
  if (!editingContext || editingContext.source !== "custom") return;
  removeCustomProject(editingContext.id);
  closeProjectDialog();
}

function applyProjectUpdate(context, payload) {
  if (context.source === "base") {
    projectOverrides[context.id] = { ...payload };
    persistOverrides();
    return;
  }

  customProjects = customProjects.map((project) => {
    if (project.id !== context.id) return project;
    return {
      ...project,
      ...payload,
      source: "custom",
    };
  });

  persistCustomProjects();
}

function removeCustomProject(projectId) {
  customProjects = customProjects.filter((project) => project.id !== projectId);
  persistCustomProjects();
  render();
}

function clearUnlocks() {
  unlockedProjects.clear();
  persistUnlockedProjects([]);
  render();
}

function toggleSettingsPanel() {
  if (settingsOpen) closeSettingsPanel();
  else openSettingsPanel();
}

function openSettingsPanel() {
  settingsOpen = true;
  settingsPanel.classList.add("open");
  settingsPanel.setAttribute("aria-hidden", "false");
  settingsBackdrop.hidden = false;
  settingsToggleBtn.setAttribute("aria-expanded", "true");
}

function closeSettingsPanel() {
  settingsOpen = false;
  settingsPanel.classList.remove("open");
  settingsPanel.setAttribute("aria-hidden", "true");
  settingsBackdrop.hidden = true;
  settingsToggleBtn.setAttribute("aria-expanded", "false");
}

function closePasswordDialog() {
  currentLockedProject = null;
  passwordDialog.close();
}

function findProjectById(id, source) {
  if (source === "base") {
    return buildProjects().find((project) => project.id === id && project.source === "base") || null;
  }
  return customProjects.find((project) => project.id === id) || null;
}

function createUniqueProjectId(url, name) {
  const parsed = parseUrl(url);
  const raw = `${parsed ? parsed.hostname : "projeto"}-${name}`;

  const base = normalize(raw)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54) || "projeto";

  const existing = new Set(buildProjects().map((project) => project.id));
  if (!existing.has(base)) return base;

  let suffix = 2;
  while (existing.has(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}

function parseTags(rawValue) {
  return String(rawValue || "")
    .split(",")
    .map((tag) => normalize(tag).replace(/[^a-z0-9- ]+/g, "").trim())
    .filter(Boolean)
    .filter((tag, index, list) => list.indexOf(tag) === index)
    .slice(0, 10);
}

function parseUrl(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return null;

  const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    return new URL(href);
  } catch {
    return null;
  }
}

function extractDomain(url) {
  const parsed = parseUrl(url);
  if (!parsed) return "sem-dominio";
  return parsed.hostname.replace(/^www\./, "");
}

function faviconFromUrl(url) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(extractDomain(url))}&sz=64`;
}

function sanitizeProjectList(value, source) {
  if (!Array.isArray(value)) return [];
  return value.map((project) => sanitizeProject(project, source)).filter(Boolean);
}

function sanitizeProject(project, source) {
  if (!project || typeof project !== "object") return null;

  const id = String(project.id || "").trim();
  const name = String(project.name || "").trim();
  const parsedUrl = parseUrl(project.url);

  if (!id || !name || !parsedUrl) return null;

  const visibility = String(project.visibility || "public") === "restricted" ? "restricted" : "public";

  const rawCategory = String(project.category || "").trim();
  const category = VALID_CATEGORIES.has(rawCategory) ? rawCategory : null;

  const sanitized = {
    id,
    name,
    description: String(project.description || "").trim(),
    url: parsedUrl.href,
    visibility,
    tags: Array.isArray(project.tags) ? project.tags.map((tag) => normalize(tag)).filter(Boolean) : [],
    updatedAt: isDateLike(project.updatedAt) ? String(project.updatedAt) : todayISO(),
    source,
  };

  if (category) sanitized.category = category;

  if (visibility === "restricted") {
    if (project.password) sanitized.password = String(project.password);
    if (project.passwordSha256) sanitized.passwordSha256 = String(project.passwordSha256);
    if (project.passwordHint) sanitized.passwordHint = String(project.passwordHint);
  }

  return sanitized;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function capitalizeWord(value) {
  const text = String(value || "").toLowerCase();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function todayISO() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!isDateLike(value)) return "--";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleDateString("pt-BR");
}

function isDateLike(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function setProjectDialogMessage(message, isError) {
  projectDialogMessage.textContent = message;
  projectDialogMessage.classList.toggle("error", Boolean(isError));
}

function readUnlockedProjects() {
  const saved = readStorage(STORAGE_UNLOCKED_KEY, []);
  return Array.isArray(saved) ? saved : [];
}

function persistUnlockedProjects(ids) {
  localStorage.setItem(STORAGE_UNLOCKED_KEY, JSON.stringify(ids));
}

function persistCustomProjects() {
  localStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(customProjects));
}

function persistOverrides() {
  localStorage.setItem(STORAGE_OVERRIDES_KEY, JSON.stringify(projectOverrides));
}

function readStorage(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallbackValue;
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showToast(message) {
  if (toastTimer) clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add("visible");
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("visible");
    toastTimer = null;
  }, 2400);
}

function exportProjects() {
  const all = buildProjects().map(({ source: _source, ...rest }) => rest);
  const json = JSON.stringify(all, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `devcentral-backup-${todayISO()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("Backup exportado com sucesso.");
}

function onImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(String(e.target.result));
      if (!Array.isArray(imported)) throw new Error("Formato invalido.");

      const existing = new Set(buildProjects().map((p) => p.id));
      const sanitized = sanitizeProjectList(imported, "custom");
      let added = 0;

      sanitized.forEach((project) => {
        if (!existing.has(project.id)) {
          customProjects.push(project);
          added++;
        }
      });

      persistCustomProjects();
      render();
      showToast(added > 0 ? `${added} projeto(s) importado(s).` : "Nenhum projeto novo encontrado.");
    } catch {
      showToast("Erro ao importar: arquivo invalido.");
    }
    event.target.value = "";
  };
  reader.readAsText(file);
}
