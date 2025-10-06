import { $refreshDOM } from "./vendor/vanjejs.module.js";

let isMenuOpen = false;
let scrollProgress = 0;

// Terminal Animation
const terminalSequence = [
  { text: "$ whoami", type: "command", delay: 0 },
  { text: "abtahi_tajwar", type: "output", delay: 800 },
  { text: "$ cat skills.txt", type: "command", delay: 1500 },
  { text: "React, TypeScript, Node.js", type: "output", delay: 2300 },
  { text: "Python, PostgreSQL, AWS", type: "output", delay: 2600 },
  { text: "$ ls projects/", type: "command", delay: 3400 },
  { text: "e-commerce-platform/", type: "success", delay: 4200 },
  { text: "ai-powered-chatbot/", type: "success", delay: 4500 },
  { text: "real-time-analytics/", type: "success", delay: 4800 },
  { text: "$ status --check", type: "command", delay: 5600 },
  { text: "✓ Available for opportunities", type: "success", delay: 6400 },
  { text: "✓ Open to collaboration", type: "success", delay: 6700 },
  { text: "$ _", type: "command", delay: 7500 },
];

function getTerminalLineClass(type) {
  switch (type) {
    case "command":
      return "terminal-command";
    case "output":
      return "terminal-output";
    case "success":
      return "terminal-success";
    case "error":
      return "terminal-error";
    default:
      return "";
  }
}

// Mobile menu toggle
document.getElementById("mobileMenuBtn").addEventListener("click", function () {
  isMenuOpen = !isMenuOpen;
  const mobileNav = document.getElementById("mobileNav");
  const menuIcon = document.getElementById("menuIcon");
  const closeIcon = document.getElementById("closeIcon");

  if (isMenuOpen) {
    mobileNav.classList.remove("hidden");
    menuIcon.classList.add("hidden");
    closeIcon.classList.remove("hidden");
  } else {
    mobileNav.classList.add("hidden");
    menuIcon.classList.remove("hidden");
    closeIcon.classList.add("hidden");
  }
});

// Close mobile menu when clicking nav links
document.querySelectorAll("#mobileNav a").forEach((link) => {
  link.addEventListener("click", function () {
    isMenuOpen = false;
    document.getElementById("mobileNav").classList.add("hidden");
    document.getElementById("menuIcon").classList.remove("hidden");
    document.getElementById("closeIcon").classList.add("hidden");
  });
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

function initTerminal() {
  const terminalBody = document.getElementById("terminalBody");
  if (!terminalBody) return;

  let currentLine = 0;
  let currentChar = 0;
  let currentTypingDiv = null;

  function typeNextChar() {
    if (currentLine >= terminalSequence.length) return;

    const line = terminalSequence[currentLine];

    if (currentChar === 0) {
      // Create new line
      currentTypingDiv = document.createElement("div");
      currentTypingDiv.className = `terminal-line ${getTerminalLineClass(
        line.type
      )}`;
      terminalBody.appendChild(currentTypingDiv);
    }

    if (currentChar < line.text.length) {
      // Type next character
      currentTypingDiv.textContent = line.text.slice(0, currentChar + 1);

      // Add cursor if it's a command
      if (line.type === "command") {
        currentTypingDiv.innerHTML =
          line.text.slice(0, currentChar + 1) +
          '<span class="terminal-cursor">▊</span>';
      }

      currentChar++;
      setTimeout(typeNextChar, 50);
    } else {
      // Finished typing this line, remove cursor
      currentTypingDiv.textContent = line.text;
      currentChar = 0;
      currentLine++;

      if (currentLine < terminalSequence.length) {
        const nextDelay =
          terminalSequence[currentLine].delay -
          terminalSequence[currentLine - 1].delay;
        setTimeout(typeNextChar, nextDelay);
      } else {
        // ✨ Start interactive shell
        window.initInteractiveTerminal?.(terminalBody, {
          userHost: "alex@portfolio",
          dataUrl: "./data.json",
        });
      }
    }
  }

  // Start typing animation
  if (terminalSequence.length > 0) {
    setTimeout(typeNextChar, terminalSequence[0].delay);
  }
}

// Initialize terminal on page load
// window.addEventListener("load", initTerminal);

// Scroll progress tracking
function updateScrollProgress() {
  const totalHeight = document.body.scrollHeight - window.innerHeight;
  const progress = (window.scrollY / totalHeight) * 100;
  scrollProgress = Math.min(100, Math.max(0, progress));
  document.getElementById("scrollProgress").style.width = scrollProgress + "%";
}

// Back to top functionality
document.getElementById("backToTop").addEventListener("click", function () {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

// Contact form submission
// document.getElementById("contactForm").addEventListener("submit", function (e) {
//   e.preventDefault();

//   // Get form data
//   const formData = new FormData(this);
//   const data = {
//     name: formData.get("name"),
//     email: formData.get("email"),
//     subject: formData.get("subject"),
//     message: formData.get("message"),
//   };

//   console.log("Form submitted:", data);

//   // Show success message (in a real app, you'd send this to a server)
//   alert("Thank you for your message! I'll get back to you soon.");

//   // Reset form
//   this.reset();
// });

// Initialize scroll progress on page load
window.addEventListener("scroll", updateScrollProgress);
window.addEventListener("load", updateScrollProgress);

// Add dark class to html element
document.documentElement.classList.add("dark");

// Animate skill progress bars on scroll
function animateSkillBars() {
  const skillBars = document.querySelectorAll(".progress-fill");
  skillBars.forEach((bar) => {
    const rect = bar.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      const width = bar.style.width;
      bar.style.width = "0%";
      setTimeout(() => {
        bar.style.width = width;
      }, 100);
    }
  });
}

// // Trigger skill bar animation on scroll
let skillsAnimated = false;
window.addEventListener("scroll", function () {
  if (!skillsAnimated) {
    const skillsSection = document.getElementById("skills");
    const rect = skillsSection.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      animateSkillBars();
      skillsAnimated = true;
    }
  }
});

// Add intersection observer for fade-in animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver(function (entries) {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
}, observerOptions);

// Observe all glassmorphism cards for animation
document.addEventListener("DOMContentLoaded", function () {
  const cards = document.querySelectorAll(".glass");
  cards.forEach((card) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(30px)";
    card.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(card);
    $refreshDOM(this.document);
  });
});

// Current Work Section - Intersection Observer for fade-in animation
const workCards = document.querySelectorAll(".work-card");
const workObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";

        // Animate progress bar
        const progressBar = entry.target.querySelector(".progress-bar");
        if (progressBar) {
          setTimeout(() => {
            progressBar.style.width = "10%";
          }, 500);
        }
      }
    });
  },
  { threshold: 0.1 }
);

workCards.forEach((card) => workObserver.observe(card));
