const menuBtn = document.getElementById('menu-btn') as HTMLButtonElement
const navLinks = document.getElementById('nav-links') as HTMLElement

menuBtn?.addEventListener('click', () => {
    navLinks?.classList.toggle('open');
});