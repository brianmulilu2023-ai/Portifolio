const API_BASE = "http://localhost:4000/api/projects";

const galleryContainer = document.getElementById("galleryContainer");
const cardTemplate = document.getElementById("projectCardTemplate");
const uploadModal = document.getElementById("uploadModal");
const openUploadBtn = document.getElementById("openUploadBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelUploadBtn = document.getElementById("cancelUploadBtn");
const uploadForm = document.getElementById("uploadForm");
const titleInput = document.getElementById("title");
const categoryInput = document.getElementById("category");
const descriptionInput = document.getElementById("description");
const fileInput = document.getElementById("fileInput");
const dropArea = document.getElementById("dropArea");
const fileNameDisplay = document.getElementById("fileNameDisplay");
const uploadProgress = document.getElementById("uploadProgress");
const progressFill = document.getElementById("progressFill");
const submitUploadBtn = document.getElementById("submitUploadBtn");

let selectedFile = null;
let toastStack = null;

function ensureToastStack() {
    if (!toastStack) {
        toastStack = document.createElement("div");
        toastStack.className = "toast-stack";
        document.body.appendChild(toastStack);
    }

    return toastStack;
}

function showToast(message, type = "success") {
    const stack = ensureToastStack();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    stack.appendChild(toast);

    window.setTimeout(() => {
        toast.remove();
        if (!stack.childElementCount) {
            stack.remove();
            toastStack = null;
        }
    }, 3200);
}

function escapeHtml(value) {
    return (value || "").replace(/[&<>"']/g, (character) => {
        const map = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return map[character] || character;
    });
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function openModal() {
    uploadModal.classList.add("is-open");
    uploadModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
    uploadModal.classList.remove("is-open");
    uploadModal.setAttribute("aria-hidden", "true");
    uploadForm.reset();
    selectedFile = null;
    fileNameDisplay.textContent = "PNG, JPG, WEBP, or GIF";
    uploadProgress.hidden = true;
    progressFill.style.width = "0%";
}

function createEmptyState(message) {
    galleryContainer.innerHTML = `<div class="empty-state">${message}</div>`;
}

function renderProjects(projects) {
    if (!projects.length) {
        createEmptyState("No projects yet. Upload your first design and it will appear here.");
        return;
    }

    galleryContainer.innerHTML = "";

    projects.forEach((project) => {
        const fragment = cardTemplate.content.cloneNode(true);
        const image = fragment.querySelector(".project-image");
        const category = fragment.querySelector(".project-category");
        const title = fragment.querySelector(".project-title");
        const description = fragment.querySelector(".project-description");
        const date = fragment.querySelector(".project-date");
        const deleteButton = fragment.querySelector(".delete-button");

        image.src = project.imageUrl;
        image.alt = project.title;
        image.loading = "lazy";
        category.textContent = project.category || "Graphic Design";
        title.textContent = project.title;
        description.textContent = project.description || "No description added for this project yet.";
        date.textContent = formatDate(project.createdAt);
        deleteButton.addEventListener("click", () => deleteProject(project.id));

        galleryContainer.appendChild(fragment);
    });
}

async function fetchProjects() {
    try {
        const response = await fetch(API_BASE);
        if (!response.ok) {
            throw new Error("Could not load projects.");
        }

        const payload = await response.json();
        renderProjects(payload.projects || []);
    } catch (error) {
        createEmptyState("The backend is not reachable yet. Start the server, then refresh the page.");
        showToast(error.message || "Failed to load projects.", "error");
    }
}

function setSelectedFile(file) {
    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {
        selectedFile = null;
        fileNameDisplay.textContent = "Please choose an image file.";
        showToast("Only image files are allowed.", "error");
        return;
    }

    selectedFile = file;
    fileNameDisplay.textContent = file.name;
}

async function deleteProject(projectId) {
    const confirmed = window.confirm("Delete this project from Supabase storage and MongoDB?");
    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/${projectId}`, { method: "DELETE" });
        const payload = await response.json();

        if (!response.ok) {
            throw new Error(payload.error || "Could not delete project.");
        }

        showToast(payload.message || "Project deleted.");
        fetchProjects();
    } catch (error) {
        showToast(error.message || "Delete failed.", "error");
    }
}

function uploadProject(event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    if (!title) {
        showToast("Project title is required.", "error");
        return;
    }

    if (!selectedFile) {
        showToast("Please choose an image before uploading.", "error");
        return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("category", categoryInput.value.trim());
    formData.append("description", descriptionInput.value.trim());
    formData.append("file", selectedFile);

    submitUploadBtn.disabled = true;
    uploadProgress.hidden = false;
    progressFill.style.width = "0%";

    const request = new XMLHttpRequest();
    request.open("POST", API_BASE, true);

    request.upload.addEventListener("progress", (eventProgress) => {
        if (!eventProgress.lengthComputable) {
            return;
        }

        const percent = Math.round((eventProgress.loaded / eventProgress.total) * 100);
        progressFill.style.width = `${percent}%`;
    });

    request.onload = () => {
        submitUploadBtn.disabled = false;

        let payload = {};
        try {
            payload = JSON.parse(request.responseText);
        } catch (error) {
            payload = {};
        }

        if (request.status >= 200 && request.status < 300) {
            showToast(payload.message || "Project uploaded successfully.");
            closeModal();
            fetchProjects();
            return;
        }

        uploadProgress.hidden = true;
        progressFill.style.width = "0%";
        showToast(payload.error || "Upload failed.", "error");
    };

    request.onerror = () => {
        submitUploadBtn.disabled = false;
        uploadProgress.hidden = true;
        progressFill.style.width = "0%";
        showToast("Network error while uploading.", "error");
    };

    request.send(formData);
}

dropArea.addEventListener("click", () => fileInput.click());
dropArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropArea.classList.add("is-dragover");
});
dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("is-dragover");
});
dropArea.addEventListener("drop", (event) => {
    event.preventDefault();
    dropArea.classList.remove("is-dragover");

    if (event.dataTransfer?.files?.length) {
        setSelectedFile(event.dataTransfer.files[0]);
    }
});

fileInput.addEventListener("change", (event) => {
    if (event.target.files?.length) {
        setSelectedFile(event.target.files[0]);
    }
});

openUploadBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);
cancelUploadBtn.addEventListener("click", closeModal);
uploadModal.addEventListener("click", (event) => {
    if (event.target === uploadModal) {
        closeModal();
    }
});
uploadForm.addEventListener("submit", uploadProject);

fetchProjects();
