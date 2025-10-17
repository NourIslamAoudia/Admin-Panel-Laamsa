/* ============================================
   🔧 CONFIGURATION
============================================ */
const API_URL = "https://api-laamsa-form.vercel.app";

/* ============================================
   🌐 STATE MANAGEMENT
============================================ */
let currentOrders = [];
let filteredOrders = [];
let currentFilter = "all";
let authToken = null;
let currentUser = null;

/* ============================================
   🎯 INITIALIZATION
============================================ */
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  initEventListeners();
});

/* ============================================
   🔐 AUTHENTICATION
============================================ */
function checkAuth() {
  authToken = localStorage.getItem("authToken");
  currentUser = localStorage.getItem("currentUser");

  if (authToken) {
    showDashboard();
    loadOrders();
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById("loginPage").style.display = "flex";
  document.getElementById("dashboardPage").style.display = "none";
}

function showDashboard() {
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("dashboardPage").style.display = "flex";

  if (currentUser) {
    document.getElementById("currentUser").textContent = currentUser;
    document.getElementById("headerUser").textContent = currentUser;
  }
}

/* ============================================
   📡 API FUNCTIONS
============================================ */
async function login(username, password) {
  try {
    const response = await fetch(`${API_URL}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (data.success) {
      authToken = data.token;
      currentUser = data.user.username;
      localStorage.setItem("authToken", authToken);
      localStorage.setItem("currentUser", currentUser);
      showDashboard();
      loadOrders();
      showToast("Connexion réussie!", "success");
    } else {
      showError(data.message || "Identifiants incorrects");
    }
  } catch (error) {
    console.error("Erreur de connexion:", error);
    showError("Erreur de connexion au serveur");
  }
}

async function loadOrders() {
  try {
    showLoading();

    const response = await fetch(`${API_URL}/admin/allorders`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      logout();
      return;
    }

    const data = await response.json();

    if (data.success) {
      currentOrders = data.orders;
      filteredOrders = currentOrders;
      displayOrders();
      updateStats();
    } else {
      showToast("Erreur lors du chargement des commandes", "error");
    }
  } catch (error) {
    console.error("Erreur:", error);
    showToast("Erreur de connexion au serveur", "error");
  } finally {
    hideLoading();
  }
}

async function getOrderById(id) {
  try {
    const response = await fetch(`${API_URL}/admin/order/${id}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      logout();
      return null;
    }

    const data = await response.json();
    return data.success ? data.order : null;
  } catch (error) {
    console.error("Erreur:", error);
    return null;
  }
}

async function updateOrderStatus(id, statut) {
  try {
    const response = await fetch(`${API_URL}/admin/order/${id}/status`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ statut }),
    });

    if (response.status === 401) {
      logout();
      return false;
    }

    const data = await response.json();

    if (data.success) {
      showToast("Statut mis à jour avec succès!", "success");
      loadOrders();
      return true;
    } else {
      showToast(data.message || "Erreur lors de la mise à jour", "error");
      return false;
    }
  } catch (error) {
    console.error("Erreur:", error);
    showToast("Erreur de connexion au serveur", "error");
    return false;
  }
}

async function deleteOrder(id) {
  try {
    const response = await fetch(`${API_URL}/admin/order/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      logout();
      return false;
    }

    const data = await response.json();

    if (data.success) {
      showToast("Commande supprimée avec succès!", "success");
      loadOrders();
      return true;
    } else {
      showToast(data.message || "Erreur lors de la suppression", "error");
      return false;
    }
  } catch (error) {
    console.error("Erreur:", error);
    showToast("Erreur de connexion au serveur", "error");
    return false;
  }
}

function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("currentUser");
  authToken = null;
  currentUser = null;
  showLogin();
  showToast("Déconnexion réussie", "success");
}

/* ============================================
   🎨 UI FUNCTIONS
============================================ */
function displayOrders() {
  const tbody = document.getElementById("ordersTableBody");
  const table = document.getElementById("ordersTable");
  const noOrdersMsg = document.getElementById("noOrdersMessage");
  const ordersCount = document.getElementById("ordersCount");

  tbody.innerHTML = "";

  if (filteredOrders.length === 0) {
    table.style.display = "none";
    noOrdersMsg.style.display = "block";
    ordersCount.textContent = "0 commandes";
    return;
  }

  table.style.display = "table";
  noOrdersMsg.style.display = "none";
  ordersCount.textContent = `${filteredOrders.length} commande${
    filteredOrders.length > 1 ? "s" : ""
  }`;

  filteredOrders.forEach((order) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>#${order.id_commande}</strong></td>
      <td>${escapeHtml(order.nom)}</td>
      <td>${escapeHtml(order.telephone)}</td>
      <td>${escapeHtml(order.wilaya)}</td>
      <td>${escapeHtml(order.commune)}</td>
      <td><strong>${order.nombre_cartes}</strong></td>
      <td><strong>${formatPrice(order.prix_total)} DA</strong></td>
      <td><span class="status-badge ${getStatusClass(
        order.statut
      )}">${getStatusText(order.statut)}</span></td>
      <td>${formatDate(order.date_heure)}</td>
      <td>
        <div class="action-buttons">
          <button class="action-btn view" onclick="viewOrder(${
            order.id_commande
          })" title="Voir détails">
            <i class="fas fa-eye"></i>
          </button>
          <button class="action-btn edit" onclick="editOrder(${
            order.id_commande
          })" title="Modifier statut">
            <i class="fas fa-edit"></i>
          </button>
          <button class="action-btn delete" onclick="confirmDelete(${
            order.id_commande
          })" title="Supprimer">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function updateStats() {
  const stats = {
    EN_ATTENTE: 0,
    CONFIRMEE: 0,
    LIVREE: 0,
    ANNULEE: 0,
  };

  currentOrders.forEach((order) => {
    if (stats.hasOwnProperty(order.statut)) {
      stats[order.statut]++;
    }
  });

  document.getElementById("statEnAttente").textContent = stats.EN_ATTENTE;
  document.getElementById("statConfirmee").textContent = stats.CONFIRMEE;
  document.getElementById("statLivree").textContent = stats.LIVREE;
  document.getElementById("statAnnulee").textContent = stats.ANNULEE;
}

async function viewOrder(id) {
  const order = await getOrderById(id);
  if (!order) return;

  const modal = document.getElementById("detailsModal");
  const modalBody = document.getElementById("detailsModalBody");

  let socialLinksHtml = "";
  if (order.reseaux_sociaux) {
    const socials = order.reseaux_sociaux;
    socialLinksHtml = '<div class="social-links">';

    if (socials.facebook) {
      socialLinksHtml += `<a href="${socials.facebook}" target="_blank"><i class="fab fa-facebook"></i> ${socials.facebook}</a>`;
    }
    if (socials.instagram) {
      socialLinksHtml += `<a href="https://instagram.com/${socials.instagram}" target="_blank"><i class="fab fa-instagram"></i> ${socials.instagram}</a>`;
    }
    if (socials.linkedin) {
      socialLinksHtml += `<a href="${socials.linkedin}" target="_blank"><i class="fab fa-linkedin"></i> ${socials.linkedin}</a>`;
    }
    if (socials.twitter) {
      socialLinksHtml += `<a href="https://twitter.com/${socials.twitter}" target="_blank"><i class="fab fa-twitter"></i> ${socials.twitter}</a>`;
    }

    socialLinksHtml += "</div>";
  } else {
    socialLinksHtml = "<p>Aucun réseau social</p>";
  }

  modalBody.innerHTML = `
    <div class="detail-row">
      <div class="detail-label">ID Commande:</div>
      <div class="detail-value"><strong>#${order.id_commande}</strong></div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Client:</div>
      <div class="detail-value">${escapeHtml(order.nom)}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Téléphone:</div>
      <div class="detail-value">${escapeHtml(order.telephone)}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Wilaya:</div>
      <div class="detail-value">${escapeHtml(order.wilaya)} (${
    order.wilaya_code
  })</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Commune:</div>
      <div class="detail-value">${escapeHtml(order.commune)}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Nombre de cartes:</div>
      <div class="detail-value"><strong>${order.nombre_cartes}</strong></div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Prix total:</div>
      <div class="detail-value"><strong>${formatPrice(
        order.prix_total
      )} DA</strong></div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Réseaux sociaux:</div>
      <div class="detail-value">${socialLinksHtml}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Statut:</div>
      <div class="detail-value"><span class="status-badge ${getStatusClass(
        order.statut
      )}">${getStatusText(order.statut)}</span></div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Date de commande:</div>
      <div class="detail-value">${formatDate(order.date_heure)}</div>
    </div>
  `;

  modal.classList.add("show");
}

function editOrder(id) {
  const order = currentOrders.find((o) => o.id_commande === id);
  if (!order) return;

  document.getElementById("editOrderId").value = id;
  document.getElementById("editStatus").value = order.statut;

  const modal = document.getElementById("editModal");
  modal.classList.add("show");
}

function confirmDelete(id) {
  document.getElementById("deleteOrderId").value = id;
  const modal = document.getElementById("deleteModal");
  modal.classList.add("show");
}

function filterOrders(status) {
  currentFilter = status;

  if (status === "all") {
    filteredOrders = currentOrders;
  } else {
    filteredOrders = currentOrders.filter((order) => order.statut === status);
  }

  displayOrders();

  // Update active filter button
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document
    .querySelector(`.filter-btn[data-status="${status}"]`)
    .classList.add("active");
}

function searchOrders(query) {
  query = query.toLowerCase().trim();

  if (!query) {
    filteredOrders =
      currentFilter === "all"
        ? currentOrders
        : currentOrders.filter((order) => order.statut === currentFilter);
  } else {
    const baseOrders =
      currentFilter === "all"
        ? currentOrders
        : currentOrders.filter((order) => order.statut === currentFilter);

    filteredOrders = baseOrders.filter(
      (order) =>
        order.nom.toLowerCase().includes(query) ||
        order.telephone.includes(query) ||
        order.commune.toLowerCase().includes(query) ||
        order.wilaya.toLowerCase().includes(query) ||
        order.id_commande.toString().includes(query)
    );
  }

  displayOrders();
}

function showLoading() {
  document.getElementById("loadingSpinner").style.display = "block";
  document.getElementById("ordersTable").style.display = "none";
  document.getElementById("noOrdersMessage").style.display = "none";
}

function hideLoading() {
  document.getElementById("loadingSpinner").style.display = "none";
}

function showError(message) {
  const errorDiv = document.getElementById("loginError");
  errorDiv.textContent = message;
  errorDiv.classList.add("show");

  setTimeout(() => {
    errorDiv.classList.remove("show");
  }, 5000);
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toastMessage");

  toast.className = `toast ${type}`;
  toastMessage.textContent = message;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

/* ============================================
   🎪 EVENT LISTENERS
============================================ */
function initEventListeners() {
  // Login form
  document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    login(username, password);
  });

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });

  // Mobile menu
  document.getElementById("mobileMenuBtn").addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");
  });

  // Close sidebar when clicking overlay
  document.getElementById("sidebarOverlay").addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
  });

  // Close sidebar when clicking a nav item on mobile
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      if (window.innerWidth <= 1024) {
        const sidebar = document.getElementById("sidebar");
        const overlay = document.getElementById("sidebarOverlay");
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
      }
    });
  });

  // Refresh button
  document.getElementById("refreshBtn").addEventListener("click", () => {
    loadOrders();
  });

  // Filter buttons
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const status = btn.getAttribute("data-status");
      filterOrders(status);
    });
  });

  // Search input
  let searchTimeout;
  document.getElementById("searchInput").addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchOrders(e.target.value);
    }, 300);
  });

  // Edit status form
  document.getElementById("editStatusForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const orderId = document.getElementById("editOrderId").value;
    const newStatus = document.getElementById("editStatus").value;
    updateOrderStatus(orderId, newStatus);
    closeModal("editModal");
  });

  // Delete confirmation
  document.getElementById("confirmDeleteBtn").addEventListener("click", () => {
    const orderId = document.getElementById("deleteOrderId").value;
    deleteOrder(orderId);
    closeModal("deleteModal");
  });

  // Modal close buttons
  document.getElementById("closeDetailsModal").addEventListener("click", () => {
    closeModal("detailsModal");
  });

  document.getElementById("closeEditModal").addEventListener("click", () => {
    closeModal("editModal");
  });

  document.getElementById("cancelEditBtn").addEventListener("click", () => {
    closeModal("editModal");
  });

  document.getElementById("closeDeleteModal").addEventListener("click", () => {
    closeModal("deleteModal");
  });

  document.getElementById("cancelDeleteBtn").addEventListener("click", () => {
    closeModal("deleteModal");
  });

  // Close modal on outside click
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("show");
      }
    });
  });

  // Prevent body scroll when modal is open
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === "class") {
        const hasModal = document.querySelector(".modal.show");
        if (hasModal) {
          document.body.style.overflow = "hidden";
        } else {
          document.body.style.overflow = "";
        }
      }
    });
  });

  document.querySelectorAll(".modal").forEach((modal) => {
    observer.observe(modal, { attributes: true });
  });
}

/* ============================================
   🛠️ UTILITY FUNCTIONS
============================================ */
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("show");
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleDateString("fr-FR", options);
}

function formatPrice(price) {
  return parseFloat(price).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStatusClass(status) {
  const statusMap = {
    EN_ATTENTE: "en-attente",
    CONFIRMEE: "confirmee",
    LIVREE: "livree",
    ANNULEE: "annulee",
  };
  return statusMap[status] || "en-attente";
}

function getStatusText(status) {
  const statusMap = {
    EN_ATTENTE: "En Attente",
    CONFIRMEE: "Confirmée",
    LIVREE: "Livrée",
    ANNULEE: "Annulée",
  };
  return statusMap[status] || status;
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
