"use strict";

const CONFIG = {
    SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxPnaaEXgXzJ6aWM42IOspTrw6lYPyhH3m-uvLxgalCVx6vb4qyNQn4XLCp7eNLS7r_1w/exec",
    DEADLINE: "2026-12-11T23:59:59+05:30",
    MAX_MB: 10,
    PHASE: "submit"
};

const $ = (s) => document.querySelector(s);
const form = $("#f");
const msg = $("#msg");
const file = $("#file");
const button = $("#go");
const bar = $("#bar");

console.log("Human Edge script loaded");

if (!form || !msg || !file || !button || !bar) {
    console.error("Required form elements are missing. Check your HTML IDs.");
} else {
    initialize();
}

function initialize() {
    $("#maxmb").textContent = CONFIG.MAX_MB;

    if (CONFIG.PHASE === "register") {
        $("#heroCta").textContent = "Register Now";
    }

    startCountdown();
    initializeAnimations();
    initializeFormat();
    initializeUpload();

    form.addEventListener("submit", submitForm);
}

function startCountdown() {
    function tick() {
        const remaining = Math.max(
            0,
            new Date(CONFIG.DEADLINE).getTime() - Date.now()
        );

        $("#cd").textContent = Math.floor(remaining / 86400000);
        $("#ch").textContent = String(Math.floor(remaining / 3600000) % 24).padStart(2, "0");
        $("#cm").textContent = String(Math.floor(remaining / 60000) % 60).padStart(2, "0");
        $("#cs").textContent = String(Math.floor(remaining / 1000) % 60).padStart(2, "0");

        if (remaining === 0) {
            $("#phaseBadge").textContent = "Submissions are now closed";
        }

        setTimeout(tick, 1000);
    }

    tick();
}

function initializeAnimations() {
    if (!("IntersectionObserver" in window)) {
        document.querySelectorAll(".rv").forEach(el => el.classList.add("in"));
        return;
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("in");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll(".rv").forEach(el => observer.observe(el));
}

function initializeFormat() {
    const hints = {
        "White Paper": "1,500–4,000 words · structured argument with clear references",
        "Published Research": "Up to 1,000 words · key findings and full citations",
        "Case Study": "1,000–2,000 words · outcomes, challenges and lessons learnt",
        "Poster Display": "A0 portrait poster + 200–300 word abstract"
    };

    $("#format").addEventListener("change", e => {
        $("#fmtHint").textContent =
            hints[e.target.value] || "Choose a format to see the length guide.";
    });
}

function initializeUpload() {
    const drop = $("#drop");

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

    $("#fn").textContent = selected
        ? `${selected.name} (${(selected.size / 1048576).toFixed(2)} MB)`
        : "";

    $("#fileErr").textContent = "";
}

function setError(element, error) {
    element.classList.toggle("bad", Boolean(error));

    const container = element.parentElement.querySelector(".err");
    if (container) container.textContent = error || "";
}

function validate() {
    let valid = true;

    form.querySelectorAll("input[required], select[required]").forEach(el => {
        let error = "";
        const value = el.value.trim();

        if (!value) {
            error = "Required";
        } else if (
            el.type === "email" &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ) {
            error = "Enter a valid email address";
        } else if (
            el.type === "tel" &&
            value.replace(/\D/g, "").length < 8
        ) {
            error = "Enter a valid phone number";
        }

        setError(el, error);
        if (error) valid = false;
    });

    const selected = file.files[0];
    const extensions = ["pdf", "doc", "docx", "jpg", "jpeg", "png"];
    let fileError = "";

    if (!selected) {
        fileError = "Please attach your file";
    } else {
        const ext = selected.name.split(".").pop().toLowerCase();

        if (!extensions.includes(ext)) {
            fileError = "Unsupported file type";
        } else if (selected.size > CONFIG.MAX_MB * 1048576) {
            fileError = `File is larger than ${CONFIG.MAX_MB} MB`;
        }
    }

    $("#fileErr").textContent = fileError;
    if (fileError) valid = false;

    if (!$("#ok").checked) {
        showMessage("Please tick the confirmation box.", "no");
        valid = false;
    }

    return valid;
}

function toBase64(selectedFile) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            resolve(String(reader.result).split(",")[1]);
        };

        reader.onerror = () => reject(new Error("Unable to read the selected file."));
        reader.readAsDataURL(selectedFile);
    });
}

function showMessage(text, type) {
    msg.className = `msg ${type}`;
    msg.textContent = text;
}

async function submitForm(e) {
    e.preventDefault();

    console.log("Submit handler started");

    msg.className = "msg";
    msg.textContent = "";

    // Anti-spam trap: real visitors never see or fill this field
    if ($("#hp_field").value) {
        showMessage("Submission blocked. Please refresh the page and try again.", "no");
        return;
    }

    if (!validate()) {
        if (!msg.textContent) {
            showMessage("Please check the required fields and try again.", "no");
        }

        // Bring the first problem into view so the visitor can see what to fix
        const firstProblem = form.querySelector(".bad") ||
            ($("#fileErr").textContent ? $("#drop") : msg);
        firstProblem.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
    }

    if (Date.now() > new Date(CONFIG.DEADLINE).getTime()) {
        showMessage("The submission deadline has passed.", "no");
        return;
    }

    if (!CONFIG.SCRIPT_URL.endsWith("/exec")) {
        showMessage("Invalid submission service URL.", "no");
        return;
    }

    const selectedFile = file.files[0];
    const fill = bar.firstElementChild;

    button.disabled = true;
    button.textContent = "Uploading...";
    bar.style.display = "block";
    fill.style.width = "10%";

    try {
        const data = Object.fromEntries(new FormData(form).entries());

        delete data.hp_field;

        data.fileName = selectedFile.name;
        data.mimeType = selectedFile.type || "application/octet-stream";
        data.fileData = await toBase64(selectedFile);

        fill.style.width = "45%";

        const response = await fetch(CONFIG.SCRIPT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify(data),
            redirect: "follow"
        });

        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`);
        }

        fill.style.width = "80%";

        const result = await response.json();

        console.log("Apps Script response:", result);

        if (!result.ok) {
            throw new Error(result.error || "Submission could not be saved.");
        }

        fill.style.width = "100%";

        
        msg.className = "msg ok";
        msg.innerHTML = `
        <div class="success-card">
            <div class="success-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
                <path
                d="M5 12.5L9.5 17L19 7"
                stroke="currentColor"
                stroke-width="2.4"
                stroke-linecap="round"
                stroke-linejoin="round"
                />
            </svg>
            </div>

            <div class="success-content">
            <span class="success-eyebrow">SUBMISSION CONFIRMED</span>
            <h3>Thank You for Your Contribution!</h3>
            <p class="success-description">
                Your submission for <strong>The Human Edge</strong>
                has been received successfully.
            </p>

            <div class="reference-card">
                <span class="reference-label">YOUR REFERENCE NUMBER</span>
                <strong class="reference-number"></strong>
            </div>

            <p class="success-note">
                <span class="success-note-icon" aria-hidden="true">✉</span>
                A confirmation email will be sent if email notifications
                are enabled.
            </p>
            </div>
        </div>
        `;

        msg.querySelector(".reference-number").textContent = result.ref;


        form.reset();
        showFile();

        msg.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    } catch (error) {
        console.error("Submission error:", error);
        const networkProblem = error instanceof TypeError;

        showMessage(
            networkProblem
                ? "Could not reach the submission service. Please check your internet connection and try again. If this continues, contact us by email."
                : "Your submission could not be completed. " + error.message,
            "no"
        );

    } finally {
        button.disabled = false;
        button.textContent = "Submit Your Work";

        setTimeout(() => {
            bar.style.display = "none";
            fill.style.width = "0%";
        }, 1500);
    }
}