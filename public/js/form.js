document.addEventListener("DOMContentLoaded", async () => {
  const formPage = document.getElementById("formPage");
  const errorPage = document.getElementById("errorPage");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const successMessage = document.getElementById("successMessage");
  const guardianNameEl = document.getElementById("guardianName");
  const form = document.getElementById("canalizacionForm");

  // Extract form token from URL: /form/{token}
  const pathParts = window.location.pathname.split("/");
  const formToken = pathParts[pathParts.length - 1];

  if (!formToken || formToken === "form") {
    formPage.style.display = "none";
    errorPage.classList.add("active");
    return;
  }

  // Validate token and get order data
  try {
    const res = await fetch(`/api/validate-form?token=${formToken}`);
    if (!res.ok) {
      formPage.style.display = "none";
      errorPage.classList.add("active");
      return;
    }
    const data = await res.json();
    guardianNameEl.textContent = data.guardianName;
    document.title = `Tu ${data.guardianName} te espera — Duendes del Uruguay`;
  } catch {
    // If validation endpoint doesn't exist yet, just show the form
    // Token will be validated on submit
  }

  // Handle form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById("submitBtn");
    submitBtn.disabled = true;

    // Collect responses
    const formData = new FormData(form);
    const responses = {};
    for (const [key, value] of formData.entries()) {
      if (value.trim()) {
        responses[key] = value.trim();
      }
    }

    // Show loading
    loadingOverlay.classList.add("active");

    try {
      const res = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formToken, responses }),
      });

      loadingOverlay.classList.remove("active");

      if (res.ok) {
        formPage.style.display = "none";
        successMessage.classList.add("active");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const err = await res.json();
        alert(err.error || "Hubo un error. Intenta de nuevo.");
        submitBtn.disabled = false;
      }
    } catch {
      loadingOverlay.classList.remove("active");
      alert("Error de conexion. Verifica tu internet e intenta de nuevo.");
      submitBtn.disabled = false;
    }
  });
});
