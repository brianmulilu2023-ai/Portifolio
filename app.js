// API Configuration
const API_BASE = "https://portifolio-yohl.onrender.com/api/projects";

// DOM Elements
const galleryContainer = document.getElementById("galleryContainer");
const cardTemplate = document.getElementById("projectCardTemplate");
const uploadModal = document.getElementById("uploadModal");
const detailModal = document.getElementById("detailModal");
const openUploadBtn = document.getElementById("openUploadBtn");
const heroUploadBtn = document.getElementById("heroUploadBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelUploadBtn = document.getElementById("cancelUploadBtn");
const uploadForm = document.getElementById("uploadForm");
const titleInput = document.getElementById("title");
const categoryInput = document.getElementById("category");
const descriptionInput = document.getElementById("description");
const projectDateInput = document.getElementById("projectDate");
const fileInput = document.getElementById("fileInput");
const dropArea = document.getElementById("dropArea");
const fileNameDisplay = document.getElementById("fileNameDisplay");
const uploadProgress = document.getElementById("uploadProgress");
const progressFill = document.getElementById("progressFill");
const progressPercent = document.getElementById("progressPercent");
const submitUploadBtn = document.getElementById("submitUploadBtn");
const imagePreview = document.getElementById("imagePreview");
const previewImg = document.getElementById("previewImg");
const removeImageBtn = document.getElementById("removeImageBtn");
const filterTabs = document.getElementById("filterTabs");
const loader = document.getElementById("loader");

// State
let selectedFile = null;
let currentProjects = [];
let currentFilter = "all";

function getDisplayDate(project) {
    return project.projectDate || project.createdAt;
}

function parseProjectDate(dateString) {
    if (!dateString) return null;

    const dateOnlyMatch = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnlyMatch) {
        const [, year, month, day] = dateOnlyMatch;
        return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const parsed = new Date(dateString);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Initialize AOS
AOS.init({
    duration: 800,
    once: true,
    offset: 100
});

// Hide loader after page load
window.addEventListener("load", () => {
    setTimeout(() => {
        loader.classList.add("fade-out");
        setTimeout(() => {
            loader.style.display = "none";
        }, 500);
    }, 500);
});

// Navigation scroll effect
window.addEventListener("scroll", () => {
    const navbar = document.getElementById("navbar");
    if (window.scrollY > 50) {
        navbar.classList.add("scrolled");
    } else {
        navbar.classList.remove("scrolled");
    }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });
});

// Toast System
function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = "slideOutRight 0.3s ease";
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

function formatDate(dateString) {
    const date = parseProjectDate(dateString);
    if (!date) return "Date not set";

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

// Modal Functions
function openModal() {
    if (projectDateInput && !projectDateInput.value) {
        projectDateInput.value = new Date().toISOString().split("T")[0];
    }
    uploadModal.classList.add("is-open");
    document.body.style.overflow = "hidden";
}

function closeModal() {
    uploadModal.classList.remove("is-open");
    uploadForm.reset();
    selectedFile = null;
    fileNameDisplay.textContent = "PNG, JPG, WEBP, or GIF (Max 10MB)";
    uploadProgress.style.display = "none";
    progressFill.style.width = "0%";
    if (progressPercent) progressPercent.textContent = "0%";
    imagePreview.style.display = "none";
    previewImg.src = "";
    document.body.style.overflow = "";
}

function openDetailModal(project) {
    const detailContent = document.getElementById("detailContent");
    detailContent.innerHTML = `
        <div class="modal-header">
            <div>
                <div class="modal-tag">${project.category || "Graphic Design"}</div>
                <h3 class="modal-title">${escapeHtml(project.title)}</h3>
            </div>
            <button class="modal-close" id="closeDetailModal">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <div class="upload-form">
            <img src="${project.imageUrl}" alt="${project.title}" style="width: 100%; border-radius: var(--radius-lg); margin-bottom: var(--space-md);">
            <div class="form-group">
                <label class="form-label">Description</label>
                <p style="color: var(--gray-600); line-height: 1.6;">${escapeHtml(project.description) || "No description provided."}</p>
            </div>
            <div class="form-group">
                <label class="form-label">Created</label>
                <p style="color: var(--gray-500);">${formatDate(getDisplayDate(project))}</p>
            </div>
        </div>
    `;
    detailModal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    
    document.getElementById("closeDetailModal").addEventListener("click", () => {
        detailModal.classList.remove("is-open");
        document.body.style.overflow = "";
    });
    
    detailModal.addEventListener("click", (e) => {
        if (e.target === detailModal) {
            detailModal.classList.remove("is-open");
            document.body.style.overflow = "";
        }
    });
}

// Render Projects
function renderProjects(projects) {
    if (!projects.length) {
        galleryContainer.innerHTML = `<div class="empty-state">
            <i class="fa-regular fa-folder-open" style="font-size: 3rem; margin-bottom: var(--space-md);"></i>
            <p>No projects yet. Upload your first design and it will appear here.</p>
            <button class="btn-primary" style="margin-top: var(--space-md);" onclick="document.getElementById('openUploadBtn').click()">
                Upload Your First Project
            </button>
        </div>`;
        return;
    }
    
    galleryContainer.innerHTML = "";
    
    projects.forEach((project) => {
        const fragment = cardTemplate.content.cloneNode(true);
        const card = fragment.querySelector(".project-card");
        const image = fragment.querySelector(".project-image");
        const category = fragment.querySelector(".project-category");
        const title = fragment.querySelector(".project-title");
        const description = fragment.querySelector(".project-description");
        const date = fragment.querySelector(".project-date");
        const deleteButton = fragment.querySelector(".delete-project-btn");
        const viewButton = fragment.querySelector(".view-project-btn");
        
        image.src = project.imageUrl;
        image.alt = project.title;
        image.loading = "lazy";
        category.textContent = project.category || "Graphic Design";
        title.textContent = project.title;
        description.textContent = project.description || "No description added for this project yet.";
        date.innerHTML = `<i class="fa-regular fa-calendar-alt"></i> ${formatDate(getDisplayDate(project))}`;
        
        deleteButton.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteProject(project.id);
        });
        
        viewButton.addEventListener("click", (e) => {
            e.stopPropagation();
            openDetailModal(project);
        });
        
        card.addEventListener("click", () => openDetailModal(project));
        
        galleryContainer.appendChild(fragment);
    });
}

// Filter Projects
function filterProjects() {
    if (currentFilter === "all") {
        renderProjects(currentProjects);
    } else {
        const filtered = currentProjects.filter(p => p.category === currentFilter);
        renderProjects(filtered);
    }
}

// Fetch Projects
async function fetchProjects() {
    try {
        const response = await fetch(API_BASE);
        if (!response.ok) throw new Error("Could not load projects.");
        
        const payload = await response.json();
        currentProjects = payload.projects || [];
        filterProjects();
    } catch (error) {
        galleryContainer.innerHTML = `<div class="empty-state">
            <i class="fa-solid fa-server" style="font-size: 3rem; margin-bottom: var(--space-md);"></i>
            <p>Backend is not reachable. Please start the server.</p>
        </div>`;
        showToast(error.message || "Failed to load projects.", "error");
    }
}

// Delete Project
async function deleteProject(projectId) {
    const confirmed = confirm("Are you sure you want to delete this project? This action cannot be undone.");
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${API_BASE}/${projectId}`, { method: "DELETE" });
        const payload = await response.json();
        
        if (!response.ok) throw new Error(payload.error || "Could not delete project.");
        
        showToast(payload.message || "Project deleted successfully.");
        fetchProjects();
    } catch (error) {
        showToast(error.message || "Delete failed.", "error");
    }
}

// Image Preview
function handleFileSelect(file) {
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
        showToast("Only image files are allowed.", "error");
        selectedFile = null;
        fileNameDisplay.textContent = "Please choose an image file.";
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showToast("File size must be less than 10MB.", "error");
        selectedFile = null;
        fileNameDisplay.textContent = "File too large (max 10MB).";
        return;
    }
    
    selectedFile = file;
    fileNameDisplay.textContent = file.name;
    
    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        imagePreview.style.display = "block";
        dropArea.querySelector(".dropzone-content").style.display = "none";
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    selectedFile = null;
    imagePreview.style.display = "none";
    previewImg.src = "";
    dropArea.querySelector(".dropzone-content").style.display = "flex";
    fileInput.value = "";
    fileNameDisplay.textContent = "PNG, JPG, WEBP, or GIF (Max 10MB)";
}

// Upload Project
function uploadProject(event) {
    event.preventDefault();
    
    const title = titleInput.value.trim();
    const projectDate = projectDateInput?.value;
    if (!title) {
        showToast("Project title is required.", "error");
        return;
    }

    if (!projectDate) {
        showToast("Please choose the project date.", "error");
        return;
    }
    
    if (!selectedFile) {
        showToast("Please choose an image before uploading.", "error");
        return;
    }
    
    const formData = new FormData();
    formData.append("title", title);
    formData.append("category", categoryInput.value.trim() || "Uncategorized");
    formData.append("description", descriptionInput.value.trim());
    formData.append("projectDate", projectDate);
    formData.append("file", selectedFile);
    
    submitUploadBtn.disabled = true;
    uploadProgress.style.display = "block";
    progressFill.style.width = "0%";
    if (progressPercent) progressPercent.textContent = "0%";
    
    const request = new XMLHttpRequest();
    request.open("POST", API_BASE, true);
    
    request.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            progressFill.style.width = `${percent}%`;
            if (progressPercent) progressPercent.textContent = `${percent}%`;
        }
    });
    
    request.onload = () => {
        submitUploadBtn.disabled = false;
        
        let payload = {};
        try {
            payload = JSON.parse(request.responseText);
        } catch (e) {
            payload = {};
        }
        
        if (request.status >= 200 && request.status < 300) {
            showToast(payload.message || "Project uploaded successfully!");
            closeModal();
            fetchProjects();
        } else {
            uploadProgress.style.display = "none";
            progressFill.style.width = "0%";
            if (progressPercent) progressPercent.textContent = "0%";
            showToast(payload.error || "Upload failed. Please try again.", "error");
        }
    };
    
    request.onerror = () => {
        submitUploadBtn.disabled = false;
        uploadProgress.style.display = "none";
        progressFill.style.width = "0%";
        if (progressPercent) progressPercent.textContent = "0%";
        showToast("Network error while uploading.", "error");
    };
    
    request.send(formData);
}

// Event Listeners
dropArea.addEventListener("click", () => fileInput.click());
dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.classList.add("is-dragover");
});
dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("is-dragover");
});
dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.classList.remove("is-dragover");
    if (e.dataTransfer?.files?.length) {
        handleFileSelect(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener("change", (e) => {
    if (e.target.files?.length) {
        handleFileSelect(e.target.files[0]);
    }
});

removeImageBtn?.addEventListener("click", removeImage);

openUploadBtn.addEventListener("click", openModal);
if (heroUploadBtn) heroUploadBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);
cancelUploadBtn.addEventListener("click", closeModal);
uploadModal.addEventListener("click", (e) => {
    if (e.target === uploadModal) closeModal();
});
uploadForm.addEventListener("submit", uploadProject);

// Filter tabs
if (filterTabs) {
    filterTabs.addEventListener("click", (e) => {
        const btn = e.target.closest(".filter-btn");
        if (!btn) return;
        
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        filterProjects();
    });
}

// Active nav link on scroll
window.addEventListener("scroll", () => {
    const sections = document.querySelectorAll("section");
    const navLinks = document.querySelectorAll(".nav-link");
    
    let current = "";
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollY >= sectionTop - 200) {
            current = section.getAttribute("id");
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("href") === `#${current}`) {
            link.classList.add("active");
        }
    });
});

// Initialize
if (projectDateInput) {
    projectDateInput.value = new Date().toISOString().split("T")[0];
}

fetchProjects();
