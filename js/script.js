
"use strict";

/* =========================================
   CONFIGURATION
========================================= */

const CONFIG = {
    SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxPnaaEXgXzJ6aWM42IOspTrw6lYPyhH3m-uvLxgalCVx6vb4qyNQn4XLCp7eNLS7r_1w/exec",
    DEADLINE: "2026-12-15T23:59:59+05:30",
    MAX_MB: 10,
    PHASE: "submit"
};

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "jpg", "jpeg", "png"];

const FORMAT_HINTS = {
    "White Paper": "1,500–4,000 words · structured argument with clear references",
    "Published Research": "Up to 1,000 words · key findings and full citations",
    "Case Study": "1,000–2,000 words · outcomes, challenges and lessons learnt",
    "Poster Display": "A0 portrait poster + 200–300 word abstract"
};

const FORMAT_HINT_DEFAULT = "Choose a format to see the length guide.";

const FILE_BADGES = {
    pdf: "PDF",
    doc: "DOC",
    docx: "DOC",
    jpg: "IMG",
    jpeg: "IMG",
    png: "IMG"
};

/* =========================================
   FORM ELEMENTS
========================================= */

const $ = (selector) => document.querySelector(selector);

const form = $("#f");
const msg = $("#msg");
const file = $("#file");
const button = $("#go");
const bar = $("#bar");
const drop = $("#drop");

let coAuthorCount = 0;

const MAX_CO_AUTHORS = 3;

/*
   Required frontend fields.
   These IDs match the latest form structure.
*/

const REQUIRED_FIELD_IDS = [
    "name",
    "email",
    "phone",
    "designation",
    "organisation",
    "organisation_type",
    "board",
    "city",
    "state",
    "theme",
    "format",
    "title",
    "abstract"
];

/* =========================================
   INITIALIZATION
========================================= */

if (!form || !msg || !file || !button || !bar) {
    console.error("Required form elements are missing. Check your HTML IDs.");
} else {
    initialize();
}

function initialize() {
    const maxMb = $("#maxmb");

    if (maxMb) {
        maxMb.textContent = CONFIG.MAX_MB;
    }

    if (CONFIG.PHASE === "register") {
        const heroCta = $("#heroCta");

        if (heroCta) {
            heroCta.textContent = "Register Now";
        }
    }

    startCountdown();
    initializeAnimations();
    initializeFormat();
    initializeUpload();
    initializeCoAuthors();

    form.addEventListener("submit", submitForm);
}

/* =========================================
   COUNTDOWN
========================================= */

function startCountdown() {
    function tick() {
        const remaining = Math.max(
            0,
            new Date(CONFIG.DEADLINE).getTime() - Date.now()
        );

        const days = $("#cd");
        const hours = $("#ch");
        const minutes = $("#cm");
        const seconds = $("#cs");

        if (days) days.textContent = Math.floor(remaining / 86400000);

        if (hours) {
            hours.textContent = String(
                Math.floor(remaining / 3600000) % 24
            ).padStart(2, "0");
        }

        if (minutes) {
            minutes.textContent = String(
                Math.floor(remaining / 60000) % 60
            ).padStart(2, "0");
        }

        if (seconds) {
            seconds.textContent = String(
                Math.floor(remaining / 1000) % 60
            ).padStart(2, "0");
        }

        if (remaining === 0) {
            const phaseBadge = $("#phaseBadge");

            if (phaseBadge) {
                phaseBadge.textContent = "Submissions are now closed";
            }

            button.disabled = true;
            button.textContent = "Submissions Closed";
            return;
        }

        setTimeout(tick, 1000);
    }

    tick();
}

/* =========================================
   SCROLL ANIMATIONS
========================================= */

function initializeAnimations() {
    const items = document.querySelectorAll(".rv");

    if (!("IntersectionObserver" in window)) {
        items.forEach(el => el.classList.add("in"));
        return;
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("in");
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    items.forEach(el => observer.observe(el));
}

/* =========================================
   FORMAT GUIDE
========================================= */

function initializeFormat() {
    const format = $("#format");
    const hint = $("#fmtHint");

    if (!format || !hint) return;

    format.addEventListener("change", updateFormatHint);
}

function updateFormatHint() {
    const format = $("#format");
    const hint = $("#fmtHint");

    if (!format || !hint) return;

    hint.textContent =
        FORMAT_HINTS[format.value] || FORMAT_HINT_DEFAULT;
}

/* =========================================
   FILE UPLOAD
========================================= */

function initializeUpload() {
    if (!drop) return;

    file.addEventListener("change", showFile);

    ["dragenter", "dragover"].forEach(eventName => {
        drop.addEventListener(eventName, e => {
            e.preventDefault();
            drop.classList.add("over");
        });
    });

    ["dragleave", "drop"].forEach(eventName => {
        drop.addEventListener(eventName, e => {
            e.preventDefault();
            drop.classList.remove("over");
        });
    });

    drop.addEventListener("drop", e => {
        if (e.dataTransfer.files.length) {
            file.files = e.dataTransfer.files;
            showFile();
        }
    });
}

function showFile() {
    const selected = file.files[0];
    const container = $("#fn");

    if (!container) return;

    container.replaceChildren();

    const fileError = $("#fileErr");

    if (fileError) {
        fileError.textContent = "";
    }

    if (!selected) return;

    const ext = selected.name.split(".").pop().toLowerCase();

    const card = document.createElement("div");
    card.className = "uploaded-file";

    const badge = document.createElement("span");
    badge.className = "uploaded-file-badge";
    badge.textContent = FILE_BADGES[ext] || "FILE";

    const details = document.createElement("div");
    details.className = "uploaded-file-details";

    const name = document.createElement("strong");
    name.className = "uploaded-file-name";
    name.textContent = selected.name;

    const size = document.createElement("span");
    size.className = "uploaded-file-size";

    size.textContent =
        `${(selected.size / 1048576).toFixed(2)} MB · ${ext.toUpperCase()}`;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-upload";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", "Remove selected file");

    remove.addEventListener("click", e => {
        e.stopPropagation();
        file.value = "";
        showFile();
    });

    details.append(name, size);
    card.append(badge, details, remove);
    container.append(card);
}

/* =========================================
   CO-AUTHORS
========================================= */

function initializeCoAuthors() {
    const addButton = $("#addCoAuthorBtn");

    if (addButton) {
        addButton.addEventListener("click", addCoAuthorRow);
    }

    updateCoAuthorButton();
}

function addCoAuthorRow() {
    const tbody = $("#coAuthorTableBody");

    if (!tbody || coAuthorCount >= MAX_CO_AUTHORS) return;

    const row = document.createElement("tr");

    row.innerHTML = `
        <td>
            <input type="text"
                class="co-name"
                placeholder="Enter name"
                aria-label="Co-author name">
        </td>

        <td>
            <input type="text"
                class="co-organisation"
                placeholder="Enter organisation"
                aria-label="Co-author organisation">
        </td>

        <td>
            <input type="email"
                class="co-email"
                placeholder="Enter email"
                aria-label="Co-author email">
        </td>

        <td>
            <button type="button"
                class="delete-btn"
                aria-label="Remove co-author">
                <i class="ri-delete-bin-6-line"></i>
            </button>
        </td>
    `;

    const deleteButton = row.querySelector(".delete-btn");

    deleteButton.addEventListener("click", () => {
        deleteCoAuthorRow(row);
    });

    tbody.appendChild(row);

    coAuthorCount++;

    updateCoAuthorButton();
}

function deleteCoAuthorRow(row) {
    if (!row) return;

    row.remove();

    coAuthorCount = Math.max(0, coAuthorCount - 1);

    updateCoAuthorButton();
}

function updateCoAuthorButton() {
    const addButton = $("#addCoAuthorBtn");

    if (!addButton) return;

    addButton.disabled = coAuthorCount >= MAX_CO_AUTHORS;

    addButton.textContent =
        coAuthorCount >= MAX_CO_AUTHORS
            ? "Maximum 3 Co-authors"
            : "Add Co-author";
}

function getCoAuthors() {
    const rows = document.querySelectorAll(
        "#coAuthorTableBody tr"
    );

    return Array.from(rows).map(row => ({
        name: row.querySelector(".co-name")?.value.trim() || "",
        organisation:
            row.querySelector(".co-organisation")?.value.trim() || "",
        email: row.querySelector(".co-email")?.value.trim() || ""
    }));
}

function validateCoAuthors() {
    const rows = document.querySelectorAll(
        "#coAuthorTableBody tr"
    );

    let valid = true;

    rows.forEach(row => {
        const name = row.querySelector(".co-name");
        const organisation = row.querySelector(".co-organisation");
        const email = row.querySelector(".co-email");

        const hasAnyValue =
            name.value.trim() ||
            organisation.value.trim() ||
            email.value.trim();

        [name, organisation, email].forEach(field => {
            field.classList.remove("bad");
        });

        if (hasAnyValue) {
            if (!name.value.trim()) {
                name.classList.add("bad");
                valid = false;
            }

            if (!organisation.value.trim()) {
                organisation.classList.add("bad");
                valid = false;
            }

            if (!email.value.trim() || !isValidEmail(email.value.trim())) {
                email.classList.add("bad");
                valid = false;
            }
        }
    });

    return valid;
}

/* =========================================
   VALIDATION HELPERS
========================================= */

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setError(element, error) {
    element.classList.toggle("bad", Boolean(error));

    const container = element.parentElement?.querySelector(".err");

    if (container) {
        container.textContent = error || "";
    }
}

function validate() {
    let valid = true;

    /*
       Validate all required fields.
       The explicit ID list ensures the latest frontend fields
       are checked even if a required attribute is missing.
    */

    const requiredFields = new Set(REQUIRED_FIELD_IDS);

    form.querySelectorAll(
        "input[required], select[required], textarea[required]"
    ).forEach(el => {
        if (el.type !== "file" && el.type !== "checkbox") {
            requiredFields.add(el.id);
        }
    });

    requiredFields.forEach(id => {
        const el = document.getElementById(id);

        if (!el || !form.contains(el)) return;

        const value = el.value.trim();
        let error = "";

        if (!value) {
            error = "This field is required.";
        } else if (el.type === "email" && !isValidEmail(value)) {
            error = "Enter a valid email address.";
        } else if (el.id === "phone") {
            const digits = value.replace(/\D/g, "");

            if (!/^\d{10}$/.test(digits)) {
                error = "Enter exactly 10 mobile digits without the country code.";
            }
        }

        setError(el, error);

        if (error) valid = false;
    });

    /*
       Validate consent checkbox.
    */

    const consent = $("#ok");

    if (consent && !consent.checked) {
        valid = false;

        showMessage(
            "Please agree to the terms and conditions before submitting.",
            "no"
        );
    }

    /*
       Validate file upload.
    */

    const selected = file.files[0];
    let fileError = "";

    if (!selected) {
        fileError = "Please attach your submission file.";
    } else {
        const ext = selected.name.split(".").pop().toLowerCase();

        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            fileError =
                "Only PDF, DOC, DOCX, JPG, JPEG and PNG files are allowed.";
        } else if (selected.size === 0) {
            fileError = "The selected file is empty.";
        } else if (selected.size > CONFIG.MAX_MB * 1024 * 1024) {
            fileError =
                `File size must not exceed ${CONFIG.MAX_MB} MB.`;
        }
    }

    const fileErrorElement = $("#fileErr");

    if (fileErrorElement) {
        fileErrorElement.textContent = fileError;
    }

    if (fileError) valid = false;

    /*
       Validate co-author rows.
       A partially completed co-author row is not accepted.
    */

    if (!validateCoAuthors()) {
        valid = false;
    }

    return valid;
}

/* =========================================
   FILE CONVERSION
========================================= */

function toBase64(selectedFile) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            resolve(String(reader.result).split(",")[1]);
        };

        reader.onerror = () => {
            reject(new Error("Unable to read the selected file."));
        };

        reader.readAsDataURL(selectedFile);
    });
}

/* =========================================
   MESSAGES
========================================= */

function showMessage(text, type) {
    msg.className = `msg ${type}`;
    msg.textContent = text;
}

function showSuccess(ref) {
    msg.className = "msg ok";
    msg.replaceChildren();

    const card = document.createElement("div");
    card.className = "success-card";

    card.innerHTML = `
        <div class="success-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 12.5L9.5 17L19 7"
                    stroke="currentColor"
                    stroke-width="2.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"/>
            </svg>
        </div>

        <div class="success-content">
            <span class="success-eyebrow">
                SUBMISSION CONFIRMED
            </span>

            <h3>Thank You for Your Contribution!</h3>

            <p class="success-description">
                Your submission for
                <strong>The Human Edge</strong>
                has been received successfully.
            </p>

            <div class="reference-card">
                <span class="reference-label">
                    YOUR REFERENCE NUMBER
                </span>

                <strong class="reference-number"></strong>
            </div>

            <p class="success-note">
                A confirmation email will be sent if email notifications are enabled.
            </p>
        </div>
    `;

    card.querySelector(".reference-number").textContent =
        ref || "Not provided";

    msg.appendChild(card);
}

/* =========================================
   RESET CO-AUTHORS
========================================= */

function resetCoAuthors() {
    const tbody = $("#coAuthorTableBody");

    if (tbody) {
        tbody.replaceChildren();
    }

    coAuthorCount = 0;

    updateCoAuthorButton();
}

/* =========================================
   FORM SUBMISSION
========================================= */

async function submitForm(e) {
    e.preventDefault();

    msg.className = "msg";
    msg.textContent = "";

    /*
       Anti-spam honeypot.
    */

    const honeypot = $("#hp_field");

    if (honeypot && honeypot.value.trim()) {
        showMessage(
            "Submission blocked. Please refresh the page and try again.",
            "no"
        );
        return;
    }

    /*
       Validate form.
    */

    if (!validate()) {
        if (!msg.textContent) {
            showMessage(
                "Please check the required fields and try again.",
                "no"
            );
        }

        const firstProblem =
            form.querySelector(".bad") ||
            ($("#fileErr")?.textContent ? $("#drop") : msg);

        firstProblem?.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        return;
    }

    const selectedFile = file.files[0];

    /*
       Check deadline.
    */

    if (Date.now() > new Date(CONFIG.DEADLINE).getTime()) {
        showMessage(
            "The submission deadline has passed.",
            "no"
        );
        return;
    }

    /*
       Check Google Apps Script URL.
    */

    if (!CONFIG.SCRIPT_URL || !CONFIG.SCRIPT_URL.endsWith("/exec")) {
        showMessage(
            "Invalid submission service URL.",
            "no"
        );
        return;
    }

    const fill = bar.firstElementChild;

    button.disabled = true;
    button.textContent = "Uploading...";

    bar.style.display = "block";

    if (fill) {
        fill.style.width = "10%";
    }

    try {
        /*
           Collect standard form fields.
        */

        const data = Object.fromEntries(
            new FormData(form).entries()
        );

        /*
           Remove the raw file input.
        */

        delete data.file;

        /*
           Add consent explicitly.
        */

        // data.consent = Boolean($("#ok")?.checked);
        // Validate both mandatory consents

        // ======================================
        // CONSENT VALIDATION
        // ======================================

        const ownershipConsent = $("#consentOwnership");
        const presentationConsent = $("#consentPresentation");
        const consentError = $("#consentError");

        const consentCards = document.querySelectorAll(".consent-card");

        const ownershipAccepted = ownershipConsent?.checked === true;
        const presentationAccepted = presentationConsent?.checked === true;

        const consentValid = ownershipAccepted && presentationAccepted;

        // Clear previous error styles
        consentCards.forEach(card => {
            card.classList.remove("has-error");
        });

        // Show or hide error message
        if (consentError) {
            consentError.hidden = consentValid;
        }

        // Stop submission if either consent is missing
        if (!consentValid) {

            if (!ownershipAccepted) {
                ownershipConsent?.closest(".consent-card")
                    ?.classList.add("has-error");
            }

            if (!presentationAccepted) {
                presentationConsent?.closest(".consent-card")
                    ?.classList.add("has-error");
            }

            consentError?.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            if (!ownershipAccepted) {
                ownershipConsent?.focus({ preventScroll: true });
            } else {
                presentationConsent?.focus({ preventScroll: true });
            }

            return;
        }

        // Both declarations accepted
        data.consent_ownership = true;
        data.consent_presentation = true;


        /*
           Collect co-author information.
        */

        data.coauthors = JSON.stringify(getCoAuthors());

        /*
           Add file details.
        */

        data.fileName = selectedFile.name;
        data.mimeType =
            selectedFile.type || "application/octet-stream";

        data.fileData = await toBase64(selectedFile);

        if (fill) {
            fill.style.width = "45%";
        }

        /*
           Send to Google Apps Script.
        */

        const response = await fetch(CONFIG.SCRIPT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify(data),
            redirect: "follow"
        });

        if (!response.ok) {
            throw new Error(
                `Server returned HTTP ${response.status}`
            );
        }

        if (fill) {
            fill.style.width = "80%";
        }

        const result = await response.json();

        if (!result.ok) {
            throw new Error(
                result.error || "Submission could not be saved."
            );
        }

        if (fill) {
            fill.style.width = "100%";
        }

        /*
           Show success message.
        */

        showSuccess(result.ref);

        /*
           Reset form and upload UI.
        */

        form.reset();

        showFile();
        updateFormatHint();
        resetCoAuthors();

        msg.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    } catch (error) {
        console.error("Submission error:", error);

        showMessage(
            error instanceof TypeError
                ? "Could not reach the submission service. Check your internet connection and try again."
                : "Your submission could not be completed. " + error.message,
            "no"
        );

    } finally {
        button.disabled = false;
        button.textContent = "Submit Your Paper";

        setTimeout(() => {
            bar.style.display = "none";

            if (fill) {
                fill.style.width = "0%";
            }
        }, 1500);
    }
}
