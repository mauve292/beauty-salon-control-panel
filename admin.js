document.addEventListener('DOMContentLoaded', function () {
                /* === ΠΛΟΗΓΗΣΗ (σταθερό) ======================================= */
        const navItems = document.querySelectorAll('.admin-nav-item');
        const sections = document.querySelectorAll('.admin-section');
        const nav = document.querySelector('.admin-nav');
        const navToggle = document.querySelector('.admin-nav-toggle');

        const floatingAddBtn = document.getElementById('btn-new-appointment');

        function setFloatingAddVisibility(sectionKey) {
            if (!floatingAddBtn) return;

            // Κρύβουμε το “+” σε Ρυθμίσεις και Επισκόπηση (όπως ζητήθηκε)
            const shouldHide = sectionKey === 'settings' || sectionKey === 'dashboard';
            floatingAddBtn.hidden = shouldHide;
            floatingAddBtn.style.display = shouldHide ? 'none' : '';
        }

        function setActiveNavItem(activeItem) {
            navItems.forEach(i => {
                const isActive = i === activeItem;
                i.classList.toggle('admin-nav-item--active', isActive);
                if (isActive) i.setAttribute('aria-current', 'page');
                else i.removeAttribute('aria-current');
            });
        }

        function showSection(sectionKey, activeItem) {
            if (!sectionKey) return;

            sections.forEach(section => {
                section.classList.toggle(
                    'admin-section--visible',
                    section.dataset.section === sectionKey
                );
            });

            if (activeItem) setActiveNavItem(activeItem);
            setFloatingAddVisibility(sectionKey);
            if (sectionKey === 'settings' && typeof window !== 'undefined' && typeof window.initSettingsUI === 'function') {
                window.initSettingsUI();
            }

            // Mobile: κλείσε το μενού όταν επιλέγεις ενότητα
            if (nav && nav.classList.contains('admin-nav--open')) {
                nav.classList.remove('admin-nav--open');
                if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
            }
        }

        // Mobile: open/close navigation
        if (nav && navToggle) {
            if (!navToggle.dataset.navToggleBound) {
                navToggle.dataset.navToggleBound = '1';
                navToggle.addEventListener('click', () => {
                    const willOpen = !nav.classList.contains('admin-nav--open');
                    nav.classList.toggle('admin-nav--open', willOpen);
                    navToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
                });
            }
            navToggle.setAttribute('aria-expanded', nav.classList.contains('admin-nav--open') ? 'true' : 'false');
        }

        // Switch sections
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                showSection(item.dataset.section, item);
            });
        });

        // Ensure correct state on first load
        const initialVisibleSection = document.querySelector('.admin-section.admin-section--visible');
        let fallbackKey = 'calendar';
        if (navItems.length && navItems[0].dataset && navItems[0].dataset.section) {
            fallbackKey = navItems[0].dataset.section;
        }
        const initialKey = initialVisibleSection && initialVisibleSection.dataset && initialVisibleSection.dataset.section
            ? initialVisibleSection.dataset.section
            : fallbackKey;

        const initialItem = Array.from(navItems).find(i => i.dataset.section === initialKey) || navItems[0];
        if (initialItem) setActiveNavItem(initialItem);
        setFloatingAddVisibility(initialKey);



/* === DASHBOARD TABS (Επισκόπηση) =================================== */
(function initDashboardTabs() {
    const dashboardSection = document.querySelector('.admin-section[data-section="dashboard"]');
    if (!dashboardSection) return;

    const tabButtons = Array.from(dashboardSection.querySelectorAll('.dash-tab[data-dash-tab]'));
    const tabPanels = Array.from(dashboardSection.querySelectorAll('.dash-tabpanel[data-dash-tabpanel]'));
    const dateSelect = dashboardSection.querySelector('#dash-date-range');
    const dateInput = dashboardSection.querySelector('#dash-date-input');
    const yearSelect = dashboardSection.querySelector('#dash-year-select');
    const halfYearSelect = dashboardSection.querySelector('#dash-half-year-select');
    const datePreview = dashboardSection.querySelector('#dash-ref-date');
    let lastDateSelection = null;

    if (!tabButtons.length || !tabPanels.length) return;

    function activateTab(key, focusButton) {
        tabButtons.forEach((btn) => {
            const isActive = btn.dataset.dashTab === key;
            btn.classList.toggle('dash-tab--active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            btn.tabIndex = isActive ? 0 : -1;
            if (isActive && focusButton) btn.focus();
        });

        tabPanels.forEach((panel) => {
            panel.hidden = panel.dataset.dashTabpanel !== key;
        });

        try { localStorage.setItem('dashboardActiveTab', key); } catch (e) { /* ignore */ }
    }

    function getStoredTab() {
        try { return localStorage.getItem('dashboardActiveTab'); } catch (e) { return null; }
    }

    let initialKey = getStoredTab();
    const keyExists = initialKey && tabButtons.some((b) => b.dataset.dashTab === initialKey);

    if (!keyExists) {
        const htmlActive = tabButtons.find((b) => b.classList.contains('dash-tab--active')) || tabButtons[0];
        initialKey = (htmlActive && htmlActive.dataset.dashTab) ? htmlActive.dataset.dashTab : 'economics';
    }

    activateTab(initialKey, false);

    tabButtons.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            activateTab(btn.dataset.dashTab, true);
        });

        // Keyboard navigation (ArrowLeft/ArrowRight/Home/End)
        btn.addEventListener('keydown', (e) => {
            const k = e.key;

            // Activate tab on Enter / Space
            if (k === 'Enter' || k === ' ' || k === 'Spacebar') {
                e.preventDefault();
                activateTab(btn.dataset.dashTab, true);
                return;
            }

            // Keyboard navigation (focus movement)
            if (k !== 'ArrowLeft' && k !== 'ArrowRight' && k !== 'Home' && k !== 'End') return;

            e.preventDefault();
            const last = tabButtons.length - 1;
            let nextIndex = index;

            if (k === 'ArrowLeft') nextIndex = (index - 1 + tabButtons.length) % tabButtons.length;
            if (k === 'ArrowRight') nextIndex = (index + 1) % tabButtons.length;
            if (k === 'Home') nextIndex = 0;
            if (k === 'End') nextIndex = last;

            tabButtons[nextIndex].focus();
        });
    });

    function pad2(value) {
        return String(value).padStart(2, '0');
    }

    function formatShortDate(date) {
        return date.toLocaleDateString('el-GR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    function getWeekRange(baseDate) {
        const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
        const weekday = base.getDay();
        const daysFromMonday = (weekday + 6) % 7;
        const monday = new Date(base);
        monday.setDate(base.getDate() - daysFromMonday);
        const saturday = new Date(monday);
        saturday.setDate(monday.getDate() + 5);
        return { start: monday, end: saturday };
    }

    function toDateInputValue(date) {
        return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
    }

    function toMonthInputValue(date) {
        return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
    }

    function getISOWeekString(date) {
        const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const day = utcDate.getUTCDay() || 7;
        utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
        const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
        const weekNumber = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
        return `${utcDate.getUTCFullYear()}-W${pad2(weekNumber)}`;
    }

    function getISOWeekStart(weekValue) {
        if (!weekValue) return null;
        const parts = weekValue.split('-W');
        if (parts.length !== 2) return null;
        const year = Number(parts[0]);
        const week = Number(parts[1]);
        if (!Number.isFinite(year) || !Number.isFinite(week)) return null;
        const jan4 = new Date(Date.UTC(year, 0, 4));
        const jan4Day = jan4.getUTCDay() || 7;
        const mondayWeek1 = new Date(jan4);
        mondayWeek1.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
        const monday = new Date(mondayWeek1);
        monday.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
        return new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate());
    }

    function getBaseDateFromInput() {
        if (!dateInput || !dateInput.value) return new Date();
        if (dateInput.type === 'week') {
            return getISOWeekStart(dateInput.value) || new Date();
        }
        if (dateInput.type === 'month') {
            const [year, month] = dateInput.value.split('-').map(Number);
            if (Number.isFinite(year) && Number.isFinite(month)) {
                return new Date(year, month - 1, 1);
            }
            return new Date();
        }
        return new Date(`${dateInput.value}T00:00:00`);
    }

    function getCurrentYear() {
        return new Date().getFullYear();
    }

    function clampYear(year, fallbackYear) {
        const safeYear = Number.isFinite(year) ? year : fallbackYear;
        return Math.min(safeYear, getCurrentYear());
    }

    function ensureYearOptions(baseYear) {
        if (!yearSelect) return clampYear(baseYear, getCurrentYear());
        const currentYear = getCurrentYear();
        const earliest = currentYear - 10;
        const safeYear = clampYear(baseYear, currentYear);
        yearSelect.innerHTML = '';
        for (let year = earliest; year <= currentYear; year += 1) {
            const option = document.createElement('option');
            option.value = String(year);
            option.textContent = String(year);
            yearSelect.appendChild(option);
        }
        return Math.min(Math.max(safeYear, earliest), currentYear);
    }

    function getYearValue(fallbackDate) {
        const selected = yearSelect ? Number(yearSelect.value) : NaN;
        return clampYear(selected, fallbackDate.getFullYear());
    }

    function setHalfYearAvailability(selectedYear) {
        if (!halfYearSelect) return;
        const currentYear = getCurrentYear();
        const currentHalf = new Date().getMonth() < 6 ? 'H1' : 'H2';
        const h1Option = halfYearSelect.querySelector('option[value="H1"]');
        const h2Option = halfYearSelect.querySelector('option[value="H2"]');
        if (h1Option) h1Option.disabled = false;
        if (h2Option) h2Option.disabled = false;

        if (selectedYear === currentYear && currentHalf === 'H1') {
            if (h2Option) h2Option.disabled = true;
        }

        if (halfYearSelect.value !== 'H1' && halfYearSelect.value !== 'H2') {
            halfYearSelect.value = selectedYear === currentYear ? currentHalf : 'H2';
        }

        if (selectedYear === currentYear && currentHalf === 'H1') {
            halfYearSelect.value = 'H1';
        }
    }

    function applyDashboardDateLimits() {
        if (!dateInput || dateInput.hidden) return;
        const today = new Date();
        dateInput.min = '';
        if (dateInput.type === 'week') {
            dateInput.max = getISOWeekString(today);
        } else if (dateInput.type === 'month') {
            dateInput.max = toMonthInputValue(today);
        } else {
            dateInput.max = toDateInputValue(today);
        }
    }

    function syncDashboardDateControls() {
        if (!dateSelect) return;
        const selection = dateSelect.value || 'day';
        const today = new Date();
        let baseDate = getBaseDateFromInput();
        if (selection !== lastDateSelection) {
            baseDate = today;
        } else if (baseDate.getTime() > today.getTime()) {
            baseDate = today;
        }
        const usesDateInput = ['day', 'week', 'month', 'custom'].includes(selection);
        const usesYear = ['year', 'half-year'].includes(selection);
        const usesHalfYear = selection === 'half-year';

        if (dateInput) {
            dateInput.hidden = !usesDateInput;
            if (usesDateInput) {
                if (selection === 'week') {
                    dateInput.type = 'week';
                    dateInput.value = getISOWeekString(baseDate);
                } else if (selection === 'month') {
                    dateInput.type = 'month';
                    dateInput.value = toMonthInputValue(baseDate);
                } else {
                    dateInput.type = 'date';
                    dateInput.value = toDateInputValue(baseDate);
                }
            }
        }

        if (yearSelect) {
            yearSelect.hidden = !usesYear;
            if (usesYear) {
                const baseYear = getYearValue(baseDate);
                const safeYear = ensureYearOptions(baseYear);
                yearSelect.value = String(safeYear);
            }
        }

        if (halfYearSelect) {
            halfYearSelect.hidden = !usesHalfYear;
            if (usesHalfYear) {
                const selectedYear = getYearValue(baseDate);
                setHalfYearAvailability(selectedYear);
            }
        }

        if (usesDateInput) {
            applyDashboardDateLimits();
        }

        lastDateSelection = selection;
    }

    function updateDashboardDatePreview() {
        if (!dateSelect || !datePreview) return;
        const selection = dateSelect.value || 'day';
        const today = new Date();

        if (selection === 'year') {
            const yearValue = getYearValue(today);
            datePreview.textContent = String(yearValue);
            return;
        }

        if (selection === 'half-year') {
            const yearValue = getYearValue(today);
            const halfValue = halfYearSelect && (halfYearSelect.value === 'H2' || halfYearSelect.value === 'H1')
                ? halfYearSelect.value
                : (today.getMonth() < 6 ? 'H1' : 'H2');
            const startMonth = halfValue === 'H2' ? 6 : 0;
            const start = new Date(yearValue, startMonth, 1);
            const end = new Date(yearValue, startMonth + 6, 0);
            const startLabel = start.toLocaleDateString('el-GR', { month: 'short', year: 'numeric' });
            const endLabel = end.toLocaleDateString('el-GR', { month: 'short', year: 'numeric' });
            datePreview.textContent = `${startLabel} - ${endLabel}`;
            return;
        }

        let baseDate = today;
        if (dateInput && dateInput.value) {
            if (selection === 'week') {
                baseDate = getISOWeekStart(dateInput.value) || today;
            } else if (selection === 'month') {
                const [year, month] = dateInput.value.split('-').map(Number);
                if (Number.isFinite(year) && Number.isFinite(month)) {
                    baseDate = new Date(year, month - 1, 1);
                }
            } else {
                baseDate = new Date(`${dateInput.value}T00:00:00`);
            }
        }

        if (selection === 'custom') {
            datePreview.textContent = formatShortDate(baseDate);
            return;
        }

        if (selection === 'week') {
            const range = getWeekRange(baseDate);
            datePreview.textContent = `${formatShortDate(range.start)} - ${formatShortDate(range.end)}`;
            return;
        }

        if (selection === 'month') {
            const monthLabel = baseDate.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
            datePreview.textContent = monthLabel;
            return;
        }

        if (selection === 'half-year') {
            const start = new Date(baseDate.getFullYear(), baseDate.getMonth() - 5, 1);
            const startLabel = start.toLocaleDateString('el-GR', { month: 'short', year: 'numeric' });
            const endLabel = baseDate.toLocaleDateString('el-GR', { month: 'short', year: 'numeric' });
            datePreview.textContent = `${startLabel} - ${endLabel}`;
            return;
        }

        datePreview.textContent = formatShortDate(baseDate);
    }

    if (dateSelect) {
        dateSelect.addEventListener('change', () => {
            syncDashboardDateControls();
            updateDashboardDatePreview();
        });
    }
    if (dateInput) {
        dateInput.addEventListener('change', updateDashboardDatePreview);
    }
    if (yearSelect) {
        yearSelect.addEventListener('change', () => {
            if (dateSelect && dateSelect.value === 'half-year') {
                setHalfYearAvailability(getYearValue(new Date()));
            }
            updateDashboardDatePreview();
        });
    }
    if (halfYearSelect) {
        halfYearSelect.addEventListener('change', updateDashboardDatePreview);
    }
    syncDashboardDateControls();
    updateDashboardDatePreview();
})();

/* === ΒΟΗΘΗΤΙΚΑ ΓΙΑ ΗΜΕΡΟΜΗΝΙΕΣ ================================ */
        const dayNamesFull = [
            'Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη',
            'Πέμπτη', 'Παρασκευή', 'Σάββατο'
        ];
        const monthNamesShort = [
            'Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιουν',
            'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'
        ];

        function startOfDay(d) {
            return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        }

        function toISODate(d) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }

        const today = startOfDay(new Date());
        const todayISO = toISODate(today);

        /* === ΟΛΑ ΤΑ date inputs: σημερινή τιμή + μπλοκάρουμε παρελθόν === */
        const allDateInputs = document.querySelectorAll('input[type="date"].control--date');
        allDateInputs.forEach(input => {
            if (input.id === 'dash-date-input') {
                input.value = todayISO;
                input.max = todayISO;
                input.removeAttribute('min');
            } else {
                input.value = todayISO;
                input.min = todayISO;
            }

            // Μην δέχεσαι πληκτρολόγηση (αλλά άφησε τα clicks για τον picker)
            input.addEventListener('keydown', function (e) {
                // Επιτρέπουμε μόνο Tab για πλοήγηση με πληκτρολόγιο
                if (e.key !== 'Tab') {
                    e.preventDefault();
                }
            });


            input.addEventListener('click', function (e) {
                if (typeof input.showPicker === "function") {
                    e.preventDefault();
                    if (typeof input.focus === 'function') {
                        input.focus({ preventScroll: true });
                    }
                    input.showPicker();
                }
            });
        });

        const extraDatePickers = document.querySelectorAll("input[type=\"date\"]:not(.control--date)");
        extraDatePickers.forEach(input => {
            input.addEventListener('click', function (e) {
                if (typeof input.showPicker === "function") {
                    e.preventDefault();
                    if (typeof input.focus === 'function') {
                        input.focus({ preventScroll: true });
                    }
                    input.showPicker();
                }
            });
        });


        /* === CALENDAR: day/week toggle + labels από το date ============ */
        const calendarDateInput = document.querySelector('.calendar-date');
        const calendarDayView = document.querySelector('.calendar-day-view');
        const calendarWeekView = document.querySelector('.calendar-week-view');
        const calendarDayLabel = document.querySelector('.calendar-day-label');
        const calendarWeekLabel = document.querySelector('.calendar-week-label');
        const calendarViewButtons = document.querySelectorAll('[data-calendar-view]');

        let currentCalendarView = 'day';

        function updateCalendarLabels(selectedDate) {
            const base = startOfDay(selectedDate);
            const isToday = base.getTime() === today.getTime();
            const weekday = base.getDay(); // 0 = Κυριακή
            const dd = String(base.getDate()).padStart(2, '0');
            const monthIndex = base.getMonth();
            const year = base.getFullYear();
            const dayNameFull = dayNamesFull[weekday];

            // Label για Ημέρα
            if (calendarDayLabel) {
                const prefix = isToday ? 'Σήμερα · ' : '';
                calendarDayLabel.textContent =
                    `${prefix}${dayNameFull} ${dd} ${monthNamesShort[monthIndex]} ${year}`;
            }

            // Label για Εβδομάδα (Δευτέρα–Κυριακή) – χρειάζεται στο desktop
            if (calendarWeekLabel) {
                const daysFromMonday = (weekday + 6) % 7; // 0=Κυρ->6, 1=Δευ->0 κλπ
                const monday = new Date(base);
                monday.setDate(base.getDate() - daysFromMonday);
                const saturday = new Date(monday);
                saturday.setDate(monday.getDate() + 5);

                const ddStart = String(monday.getDate()).padStart(2, '0');
                const ddEnd   = String(saturday.getDate()).padStart(2, '0');
                const monthStart = monthNamesShort[monday.getMonth()];
                const monthEnd   = monthNamesShort[saturday.getMonth()];
                const yearStart  = monday.getFullYear();
                const yearEnd    = saturday.getFullYear();

                let label;
                if (yearStart === yearEnd && monthStart === monthEnd) {
                    label = `${ddStart}-${ddEnd} ${monthStart} ${yearStart}`;
                } else if (yearStart === yearEnd) {
                    label = `${ddStart} ${monthStart} - ${ddEnd} ${monthEnd} ${yearStart}`;
                } else {
                    label = `${ddStart} ${monthStart} ${yearStart} - ${ddEnd} ${monthEnd} ${yearEnd}`;
                }
                calendarWeekLabel.textContent = label;
            }
        }

        function setCalendarPickerVisibility(view) {
            const isDayView = view === 'day';

            if (calendarDateInput) {
                calendarDateInput.classList.toggle('calendar-date--hidden', !isDayView);
            }

            if (calendarWeekLabel) {
                calendarWeekLabel.style.display = isDayView ? 'none' : 'inline-flex';
                calendarWeekLabel.hidden = isDayView;
            }
        }

        // Βοηθός: ορίζει ημερομηνία στο input + labels, χωρίς να πάει πριν από σήμερα
        function setCalendarDate(baseDate) {
            if (!calendarDateInput) return;

            const base = startOfDay(baseDate);
            if (base < today) {
                calendarDateInput.value = todayISO;
                updateCalendarLabels(today);
                return;
            }

            const iso = toISODate(base);
            calendarDateInput.value = iso;
            updateCalendarLabels(base);
        }

        if (calendarDateInput) {
            // Initial labels με τη σημερινή μέρα
            calendarDateInput.value = todayISO;
            updateCalendarLabels(today);

            // Όλο το tile να ανοίγει τον picker (όπου υποστηρίζεται)

            // Όταν αλλάζει η ημερομηνία από τον picker
            calendarDateInput.addEventListener('change', function () {
                if (!calendarDateInput.value) return;
                const picked = new Date(calendarDateInput.value + 'T00:00:00');
                setCalendarDate(picked);
                if (typeof window !== 'undefined' && typeof window.renderDayViewForSelectedDate === 'function') {
                    window.renderDayViewForSelectedDate();
                }
                if (typeof window !== 'undefined' && typeof window.updateEmployeeOptionLists === 'function') {
                    window.updateEmployeeOptionLists();
                }
                if (typeof window !== 'undefined' && typeof window.updateEmployeeSelectForService === 'function') {
                    window.updateEmployeeSelectForService();
                }
                if (typeof window !== 'undefined' && typeof window.applyOfflineToDayList === 'function') {
                    window.applyOfflineToDayList(calendarDateInput.value);
                }
            });
        }

        if (calendarWeekLabel && calendarDateInput) {
            calendarWeekLabel.addEventListener('click', function () {
                const wasHidden = calendarDateInput.classList.contains('calendar-date--hidden');
                let restoreHidden = null;

                if (wasHidden) {
                    calendarDateInput.classList.remove('calendar-date--hidden');
                    restoreHidden = function () {
                        calendarDateInput.classList.add('calendar-date--hidden');
                        calendarDateInput.removeEventListener('blur', restoreHidden);
                        calendarDateInput.removeEventListener('change', restoreHidden);
                    };
                    calendarDateInput.addEventListener('blur', restoreHidden);
                    calendarDateInput.addEventListener('change', restoreHidden);
                }

                if (typeof calendarDateInput.showPicker === 'function') {
                    if (typeof calendarDateInput.focus === 'function') {
                        calendarDateInput.focus({ preventScroll: true });
                    }
                    calendarDateInput.showPicker();
                } else {
                    calendarDateInput.focus();
                    calendarDateInput.click();
                }
            });
        }

        setCalendarPickerVisibility(currentCalendarView);

        // === Mobile: swipe αριστερά/δεξιά στην ημερήσια προβολή ===
        if (calendarDayView && calendarDateInput) {
            let touchStartX = 0;
            let touchStartY = 0;
            const SWIPE_THRESHOLD = 40;  // ελάχιστη οριζόντια κίνηση (px)
            const SWIPE_RESTRAINT = 80;  // μέγιστη κατακόρυφη απόκλιση (px)

            function handleStart(e) {
                const p = e.touches ? e.touches[0] : e;
                touchStartX = p.clientX;
                touchStartY = p.clientY;
            }

            function handleEnd(e) {
                const p = e.changedTouches ? e.changedTouches[0] : e;
                const dx = p.clientX - touchStartX;
                const dy = p.clientY - touchStartY;

                // Χρειαζόμαστε καθαρό οριζόντιο swipe
                if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_RESTRAINT) {
                    return;
                }

                // Τρέχουσα ημερομηνία από το input
                let current = today;
                if (calendarDateInput.value) {
                    current = startOfDay(new Date(calendarDateInput.value + 'T00:00:00'));
                }

                let next = new Date(current);
                if (dx < 0) {
                    // swipe προς τα αριστερά -> επόμενη μέρα
                    next.setDate(current.getDate() + 1);
                } else {
                    // swipe προς τα δεξιά -> προηγούμενη μέρα (όχι πριν από σήμερα)
                    next.setDate(current.getDate() - 1);
                    if (next < today) {
                        next = today;
                    }
                }

                setCalendarDate(next);
            }

            calendarDayView.addEventListener('touchstart', handleStart, { passive: true });
            calendarDayView.addEventListener('touchend', handleEnd);

            // Προαιρετικά: "swipe" με mouse για δοκιμή στο desktop
            calendarDayView.addEventListener('mousedown', handleStart);
            calendarDayView.addEventListener('mouseup', handleEnd);
        }


        // Toggle Ημέρα / Εβδομάδα
        if (calendarViewButtons.length && calendarDayView && calendarWeekView) {
            calendarViewButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const view = button.dataset.calendarView;

                    // Σε κινητά, αγνοούμε πλήρως την εβδομαδιαία προβολή
                    if (view === 'week' && window.matchMedia('(max-width: 600px)').matches) {
                        return;
                    }

                    currentCalendarView = view;

                    calendarViewButtons.forEach(btn => {
                        const isActive = btn === button;
                        btn.classList.toggle('control--chip-active', isActive);
                        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
                    });

                    if (view === 'week') {
                        calendarDayView.style.display = 'none';
                        calendarWeekView.style.display = 'block';
                    } else {
                        calendarDayView.style.display = 'block';
                        calendarWeekView.style.display = 'none';
                    }

                    setCalendarPickerVisibility(view);
                    if (view === 'day' && typeof window !== 'undefined' && typeof window.renderDayViewForSelectedDate === 'function') {
                        window.renderDayViewForSelectedDate();
                    }
                });
            });
        }

        // Schedule selection (All + staff)
        const scheduleSelect = document.getElementById('calendar-schedule-select');
        const calendarDayGrid = document.querySelector('.calendar-day-grid');
        const calendarDayList = document.querySelector('.calendar-day-view .appointments-list');

        let currentScheduleKey = 'all';

        function setScheduleView(key) {
            currentScheduleKey = key || 'all';
            if (calendarDayGrid) {
                calendarDayGrid.dataset.scheduleView = key;
            }

            if (calendarDayList) {
                const cards = Array.from(calendarDayList.querySelectorAll('.appointment-card'));
                cards.forEach((card) => {
                    const cardKey = card.dataset.employee || card.dataset.calendarSchedule || card.dataset.schedule || 'all';
                    const shouldShow = currentScheduleKey === 'all' || cardKey === currentScheduleKey;
                    card.style.display = shouldShow ? '' : 'none';
                });
            }

            if (scheduleSelect) {
                scheduleSelect.value = key;
            }

            if (typeof window !== 'undefined' && typeof window.renderDayViewForSelectedDate === 'function') {
                window.renderDayViewForSelectedDate();
            }
        }

        let scheduleInitialKey = 'all';
        if (scheduleSelect) {
            scheduleInitialKey = scheduleSelect.value || 'all';
        }

        if (scheduleSelect) {
            setScheduleView(scheduleInitialKey || 'all');
        }

        if (scheduleSelect) {
            scheduleSelect.addEventListener('change', () => {
                setScheduleView(scheduleSelect.value || 'all');
            });
        }

        if (typeof window !== 'undefined') {
            window.__adminJsReady = true;
        }

    });

document.addEventListener('DOMContentLoaded', function () {
    // Shared modal overlay for all edit panels (customers, services, appointments)
    const editOverlay = document.getElementById('global-edit-overlay');
    const overlapPanel = document.getElementById('calendar-overlap-panel');
    const overlapList = document.getElementById('calendar-overlap-list');
    const overlapClose = document.getElementById('calendar-overlap-close');
    const overlapPrev = document.getElementById('calendar-overlap-prev');
    const overlapNext = document.getElementById('calendar-overlap-next');
    const overlapCounter = document.getElementById('calendar-overlap-counter');
    const overlapTime = document.getElementById('calendar-overlap-time');
    const overlapService = document.getElementById('calendar-overlap-service');
    const overlapClient = document.getElementById('calendar-overlap-client');
    const overlapStatus = document.getElementById('calendar-overlap-status');
    const overlapEmployee = document.getElementById('calendar-overlap-employee');

    if (editOverlay) {
        editOverlay.hidden = true;
        editOverlay.style.display = 'none';
    }

    let overlapItems = [];
    let overlapIndex = 0;

    function openOverlay() {
        if (!editOverlay) return;
        editOverlay.hidden = false;
        editOverlay.style.display = 'block';
        document.body.classList.add('modal-open');
        const settingsVisible = !!document.querySelector('.admin-section.admin-section--visible[data-section="settings"]');
        document.body.classList.toggle('overlay-in-settings', settingsVisible);
    }

    function closeOverlay() {
        if (!editOverlay) return;
        editOverlay.hidden = true;
        editOverlay.style.display = 'none';
        document.body.classList.remove('modal-open');
        document.body.classList.remove('overlay-in-settings');
    }

    function isHidden(el) {
        return !el || el.hidden === true;
    }

    function parseOverlapData(raw) {
        if (!raw) return [];
        return raw.split(';').map((entry) => {
            const parts = entry.split('|').map((p) => p.trim());
            return {
                time: parts[0] || '',
                service: parts[1] || '',
                client: parts[2] || '',
                status: parts[3] || '',
                employee: parts[4] || ''
            };
        }).filter((item) => item.time || item.service || item.client);
    }

    function getStatusLabel(value) {
        if (value === 'completed') return 'Ολοκληρώθηκε';
        if (value === 'pending') return 'Σε αναμονή';
        if (value === 'no-show') return 'No show';
        return '—';
    }

    function getEmployeeLabel(value) {
        if (value === 'e1') return 'Άννα';
        if (value === 'e2') return 'Μαρία';
        if (value === 'e3') return 'Ελένη';
        return '—';
    }


    function closeOverlapPanel() {
        if (!overlapPanel) return;
        overlapPanel.hidden = true;
        overlapPanel.style.display = 'none';

        if (isHidden(customerEditPanel) && isHidden(serviceEditPanel) &&
            isHidden(appointmentInspectPanel) && isHidden(customerHistoryPanel)) {
            closeOverlay();
        }
    }

    function renderOverlapDetail() {
        if (!overlapItems.length) {
            if (overlapCounter) overlapCounter.textContent = '0 / 0';
            if (overlapPrev) overlapPrev.disabled = true;
            if (overlapNext) overlapNext.disabled = true;
            if (overlapTime) overlapTime.textContent = '—';
            if (overlapService) overlapService.textContent = '—';
            if (overlapClient) overlapClient.textContent = '—';
            if (overlapStatus) overlapStatus.textContent = '—';
            if (overlapEmployee) overlapEmployee.textContent = '—';
            return;
        }

        const total = overlapItems.length;
        overlapIndex = Math.max(0, Math.min(overlapIndex, total - 1));
        const item = overlapItems[overlapIndex];

        if (overlapCounter) overlapCounter.textContent = `${overlapIndex + 1} / ${total}`;
        if (overlapPrev) overlapPrev.disabled = overlapIndex === 0;
        if (overlapNext) overlapNext.disabled = overlapIndex === total - 1;

        if (overlapTime) overlapTime.textContent = item.time || '--:--';
        if (overlapService) overlapService.textContent = item.service || '-';
        if (overlapClient) overlapClient.textContent = item.client || '-';
        if (overlapStatus) overlapStatus.textContent = getStatusLabel(item.status);
        if (overlapEmployee) overlapEmployee.textContent = getEmployeeLabel(item.employee);

        if (overlapList) {
            overlapList.querySelectorAll('.calendar-overlap-item').forEach((row) => {
                const isActive = Number(row.dataset.index) === overlapIndex;
                row.style.borderColor = isActive ? 'rgba(252, 249, 216, 0.6)' : '';
            });
        }
    }

    function openOverlapPanel(items) {
        if (!overlapPanel || !overlapList) return;
        overlapList.innerHTML = '';
        overlapItems = items || [];
        overlapIndex = 0;

        if (!overlapItems.length) {
            overlapList.innerHTML = '<div class="calendar-overlap-item"><span>Δεν υπάρχουν λεπτομέρειες.</span></div>';
        } else {
            overlapItems.forEach((item, idx) => {
                const row = document.createElement('div');
                row.className = 'calendar-overlap-item';
                row.dataset.index = String(idx);
                row.innerHTML = `
                    <span>${item.time || '--:--'}</span>
                    <span>${item.service || '-'}</span>
                    <span>${item.client || '-'}</span>
                `.trim();
                overlapList.appendChild(row);
            });
        }

        overlapPanel.hidden = false;
        overlapPanel.style.display = 'block';
        openOverlay();
        renderOverlapDetail();
    }


    if (editOverlay) {
        // Click on the dark background closes any open edit panel
        editOverlay.addEventListener('click', function () {
            closeCustomerEditor();
            closeCustomerHistoryPanel();
            closeServiceEditor();
            closeAppointmentInspector();
            closeOverlapPanel();
            if (typeof window !== 'undefined' && typeof window.closeEmployeeEditor === 'function') {
                window.closeEmployeeEditor();
            }
            if (typeof window !== 'undefined' && typeof window.closeEmployeeOfflinePanel === 'function') {
                window.closeEmployeeOfflinePanel();
            }
            var employeePanel = document.getElementById('employee-edit-panel');
            if (employeePanel) {
                employeePanel.hidden = true;
                employeePanel.style.display = 'none';
            }
            var offlinePanel = document.getElementById('employee-offline-panel');
            if (offlinePanel) {
                offlinePanel.hidden = true;
                offlinePanel.style.display = 'none';
            }
            closeOverlay();
        });
    }

    /* === ΠΕΛΑΤΕΣ: add / edit / delete =================================== */
    const customersTable = document.getElementById('customers-table');
    const customersSearchInput = document.getElementById('customers-search-input');
    const btnNewCustomer = document.getElementById('btn-new-customer');
    const customerEditPanel = document.getElementById('customer-edit-panel');
    const customerEditForm = document.getElementById('customer-edit-form');
    const customerEditTitle = document.getElementById('customer-edit-title');
    const customerCancelEdit = document.getElementById('customer-cancel-edit');
    const customerDeleteBtn = document.getElementById('customer-delete');
    const customerHistoryPanel = document.getElementById('customer-history-panel');
    const customerHistoryList = document.getElementById('customer-history-list');
    const customerHistoryName = document.getElementById('customer-history-name');
    const customerHistoryClose = document.getElementById('customer-history-close');
    const customerHistoryBtn = document.getElementById('customer-history-btn');

    let activeCustomerRow = null;   // ποια γραμμή επεξεργαζόμαστε
    let customerFormMode = 'edit';  // 'edit' ή 'new'
    let activeCustomerName = '';

    function getCustomerRowData(row) {
        const cells = row.querySelectorAll('span, div');
        return {
            name: ((cells[0] ? cells[0].textContent : '') || '').trim(),
            phone: ((cells[1] ? cells[1].textContent : '') || '').trim(),
            email: ((cells[2] ? cells[2].textContent : '') || '').trim(),
            lastAppointment: ((cells[3] ? cells[3].textContent : '') || '').trim(),
            notes: ((cells[4] ? cells[4].textContent : '') || '').trim()
        };
    }

    function setCustomerRowData(row, data) {
        const cells = row.querySelectorAll('span, div');
        if (cells[0]) cells[0].textContent = data.name || '';
        if (cells[1]) cells[1].textContent = data.phone || '';
        if (cells[2]) cells[2].textContent = data.email || '';
        if (cells[3]) cells[3].textContent = data.lastAppointment || '';
        if (cells[4]) cells[4].textContent = data.notes || '';
    }

    function openCustomerEditor(row, mode) {
        activeCustomerRow = row;
        customerFormMode = mode || 'edit';

        const isNew = customerFormMode === 'new';
        customerEditTitle.textContent = isNew
            ? 'Νέος πελάτης'
            : 'Επεξεργασία πελάτη';
        if (customerHistoryBtn) {
            customerHistoryBtn.style.display = isNew ? 'none' : 'inline-flex';
        }

        if (isNew) {
            customerEditForm.reset();
            customerDeleteBtn.style.display = 'none';
            activeCustomerName = '';
        } else if (row) {
            const data = getCustomerRowData(row);
            customerEditForm.name.value = data.name || '';
            customerEditForm.phone.value = data.phone || '';
            customerEditForm.email.value = data.email || '';
            customerEditForm.lastAppointment.value = data.lastAppointment || '';
            customerEditForm.notes.value = data.notes || '';
            customerDeleteBtn.style.display = 'inline-flex';
            activeCustomerName = data.name || '';
        } else {
            activeCustomerName = '';
        }

        customerEditPanel.hidden = false;
        openOverlay();
    }

    function closeCustomerEditor() {
        if (customerEditPanel) {
            customerEditPanel.hidden = true;
        }
        if (customerHistoryPanel) {
            customerHistoryPanel.hidden = true;
            customerHistoryPanel.style.display = 'none';
        }
        activeCustomerRow = null;
        activeCustomerName = '';
        customerFormMode = 'edit';
        // overlay is closed centrally depending on which panels are visible
    }

    function normalizeCustomerName(value) {
        return (value || '').trim().toLowerCase();
    }

    function toISODateValue(dateObj) {
        if (!dateObj || Number.isNaN(dateObj.getTime())) return '';
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function formatHistoryDate(value) {
        if (!value) return '—';
        const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return value;
        return `${match[3]}/${match[2]}/${match[1]}`;
    }

    function getWeekDateForSlot(slot) {
        if (!slot || !calendarWeekView) return '';
        const columns = Array.from(calendarWeekView.querySelectorAll('.calendar-column'));
        const column = slot.closest('.calendar-column');
        const index = columns.indexOf(column);
        if (index < 0) return '';
        const baseValue = calendarDateInput && calendarDateInput.value ? calendarDateInput.value : '';
        const baseDate = baseValue ? new Date(`${baseValue}T00:00:00`) : new Date();
        if (Number.isNaN(baseDate.getTime())) return '';
        const weekday = baseDate.getDay();
        const daysFromMonday = (weekday + 6) % 7;
        const monday = new Date(baseDate);
        monday.setDate(baseDate.getDate() - daysFromMonday);
        const target = new Date(monday);
        target.setDate(monday.getDate() + index);
        return toISODateValue(target);
    }

    function buildCustomerHistory(name) {
        const normalized = normalizeCustomerName(name);
        if (!normalized) return [];
        const records = [];
        const seen = new Set();

        const addRecord = (record) => {
            if (!record) return;
            const key = [
                record.date || '',
                record.time || '',
                record.service || '',
                record.client || '',
                record.employee || ''
            ].map((value) => (value || '').toString().trim().toLowerCase()).join('|');
            if (seen.has(key)) return;
            seen.add(key);
            records.push(record);
        };

        const dayDate = calendarDateInput && calendarDateInput.value ? calendarDateInput.value : '';
        const dayCards = document.querySelectorAll('.calendar-day-view .appointment-card, .calendar-day-view .calendar-appointment');
        dayCards.forEach((card) => {
            const data = getAppointmentDataFromCard(card);
            if (normalizeCustomerName(data.client) !== normalized) return;
            addRecord({
                date: (card && card.dataset ? card.dataset.date : '') || dayDate,
                time: data.time || '',
                service: data.service || '',
                client: data.client || '',
                statusValue: data.statusValue || '',
                employee: data.employee || ''
            });
        });

        const weekSlots = document.querySelectorAll('.calendar-week-view .calendar-slot--busy');
        weekSlots.forEach((slot) => {
            const slotDate = (slot && slot.dataset ? slot.dataset.date : '') || getWeekDateForSlot(slot);
            let raw = slot && slot.dataset ? slot.dataset.appointments || '' : '';
            if (!raw) {
                const bubble = slot.querySelector('.calendar-slot-bubble');
                raw = bubble && bubble.dataset ? bubble.dataset.appointments || '' : '';
            }
            if (raw) {
                const items = parseOverlapData(raw);
                items.forEach((item) => {
                    if (normalizeCustomerName(item.client) !== normalized) return;
                    addRecord({
                        date: slotDate || '',
                        time: item.time || '',
                        service: item.service || '',
                        client: item.client || '',
                        statusValue: item.status || '',
                        employee: item.employee || ''
                    });
                });
                return;
            }

            const data = getAppointmentDataFromWeekSlot(slot);
            if (normalizeCustomerName(data.client) !== normalized) return;
            addRecord({
                date: data.date || slotDate || '',
                time: data.time || '',
                service: data.service || '',
                client: data.client || '',
                statusValue: data.statusValue || '',
                employee: data.employee || ''
            });
        });

        records.sort((a, b) => {
            const dateA = a.date || '';
            const dateB = b.date || '';
            if (dateA !== dateB) return dateA > dateB ? -1 : 1;
            const timeA = parseTimeToMinutes(a.time);
            const timeB = parseTimeToMinutes(b.time);
            if (!Number.isFinite(timeA) && !Number.isFinite(timeB)) return 0;
            if (!Number.isFinite(timeA)) return 1;
            if (!Number.isFinite(timeB)) return -1;
            if (timeA === timeB) return 0;
            return timeB - timeA;
        });

        return records;
    }

    function renderCustomerHistory(records, name) {
        if (customerHistoryName) {
            customerHistoryName.textContent = name ? `Πελάτης: ${name}` : '—';
        }
        if (!customerHistoryList) return;
        customerHistoryList.innerHTML = '';
        if (!records.length) {
            const empty = document.createElement('div');
            empty.className = 'customer-history-empty';
            empty.textContent = 'Δεν υπάρχουν ραντεβού.';
            customerHistoryList.appendChild(empty);
            return;
        }

        records.forEach((record) => {
            const item = document.createElement('div');
            item.className = 'customer-history-item';

            const rowMain = document.createElement('div');
            rowMain.className = 'customer-history-row';

            const serviceSpan = document.createElement('span');
            serviceSpan.className = 'customer-history-service';
            serviceSpan.textContent = record.service || '—';

            const timeSpan = document.createElement('span');
            timeSpan.className = 'customer-history-time';
            timeSpan.textContent = record.time || '--:--';

            rowMain.appendChild(serviceSpan);
            rowMain.appendChild(timeSpan);

            const rowMeta = document.createElement('div');
            rowMeta.className = 'customer-history-row customer-history-row--secondary';

            const dateSpan = document.createElement('span');
            dateSpan.className = 'customer-history-date';
            dateSpan.textContent = formatHistoryDate(record.date);

            const employeeSpan = document.createElement('span');
            employeeSpan.className = 'customer-history-employee';
            employeeSpan.textContent = getEmployeeLabel(record.employee);

            const statusSpan = document.createElement('span');
            let statusClass = 'appointment-status';
            if (record.statusValue === 'completed') {
                statusClass += ' appointment-status--completed';
            } else if (record.statusValue === 'pending') {
                statusClass += ' appointment-status--pending';
            } else if (record.statusValue === 'no-show') {
                statusClass += ' appointment-status--no-show';
            }
            statusSpan.className = statusClass;
            statusSpan.textContent = getStatusLabel(record.statusValue);

            rowMeta.appendChild(dateSpan);
            rowMeta.appendChild(employeeSpan);
            rowMeta.appendChild(statusSpan);

            item.appendChild(rowMain);
            item.appendChild(rowMeta);
            customerHistoryList.appendChild(item);
        });
    }

    function openCustomerHistory(name) {
        if (!customerHistoryPanel) return;
        const safeName = (name || '').trim();
        if (!safeName) return;
        const records = buildCustomerHistory(safeName);
        renderCustomerHistory(records, safeName);
        customerHistoryPanel.hidden = false;
        customerHistoryPanel.style.display = 'block';
        openOverlay();
    }

    function closeCustomerHistoryPanel() {
        if (customerHistoryPanel) {
            customerHistoryPanel.hidden = true;
            customerHistoryPanel.style.display = 'none';
        }
        if (isHidden(customerEditPanel) && isHidden(serviceEditPanel) &&
            isHidden(appointmentInspectPanel) && isHidden(overlapPanel)) {
            closeOverlay();
        }
    }

    function createCustomerRow(data) {
        const row = document.createElement('div');
        row.className = 'table-row';

        const nameSpan = document.createElement('span');
        const phoneSpan = document.createElement('span');
        const emailSpan = document.createElement('span');
        const lastSpan = document.createElement('span');
        const notesSpan = document.createElement('span');

        nameSpan.textContent = data.name || '';
        phoneSpan.textContent = data.phone || '';
        emailSpan.textContent = data.email || '';
        lastSpan.textContent = data.lastAppointment || '';
        notesSpan.textContent = data.notes || '';

        row.appendChild(nameSpan);
        row.appendChild(phoneSpan);
        row.appendChild(emailSpan);
        row.appendChild(lastSpan);
        row.appendChild(notesSpan);

        attachCustomerRowHandler(row);
        customersTable.appendChild(row);

        return row;
    }

    function attachCustomerRowHandler(row) {
        row.style.cursor = 'pointer';
        row.addEventListener('click', function () {
            openCustomerEditor(row, 'edit');
        });
    }

    if (customersTable && customerEditPanel && customerEditForm) {
        // κάνουμε κάθε υπάρχουσα γραμμή clickable
        const existingCustomerRows = customersTable.querySelectorAll('.table-row');
        existingCustomerRows.forEach(attachCustomerRowHandler);

        // νέο πελάτη
        if (btnNewCustomer) {
            btnNewCustomer.addEventListener('click', function () {
                openCustomerEditor(null, 'new');
            });
        }

        // submit φόρμας (save)
        customerEditForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const data = {
                name: customerEditForm.name.value.trim(),
                phone: customerEditForm.phone.value.trim(),
                email: customerEditForm.email.value.trim(),
                lastAppointment: customerEditForm.lastAppointment.value.trim(),
                notes: customerEditForm.notes.value.trim()
            };

            if (customerFormMode === 'edit' && activeCustomerRow) {
                setCustomerRowData(activeCustomerRow, data);
            } else {
                // new
                const newRow = createCustomerRow(data);
                activeCustomerRow = newRow;
            }

            customerEditPanel.hidden = true;
            if (isHidden(appointmentInspectPanel) && isHidden(serviceEditPanel) &&
                isHidden(overlapPanel) && isHidden(customerHistoryPanel)) {
                closeOverlay();
            }
        });

        // cancel
        customerCancelEdit.addEventListener('click', function () {
            customerEditPanel.hidden = true;
            if (isHidden(appointmentInspectPanel) && isHidden(serviceEditPanel) &&
                isHidden(overlapPanel) && isHidden(customerHistoryPanel)) {
                closeOverlay();
            }
        });

        // delete
        customerDeleteBtn.addEventListener('click', function () {
            if (activeCustomerRow && confirm('Να διαγραφεί ο πελάτης;')) {
                activeCustomerRow.remove();
                customerEditPanel.hidden = true;
                if (isHidden(appointmentInspectPanel) && isHidden(serviceEditPanel) &&
                    isHidden(overlapPanel) && isHidden(customerHistoryPanel)) {
                    closeOverlay();
                }
            }
        });

        // απλή αναζήτηση (frontend μόνο)
        if (customersSearchInput) {
            customersSearchInput.addEventListener('input', function () {
                const term = customersSearchInput.value.toLowerCase().trim();
                const rows = customersTable.querySelectorAll('.table-row');

                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(term) ? '' : 'none';
                });
            });
        }
    }

    if (customerHistoryBtn && customerHistoryBtn.dataset.historyBound !== '1') {
        customerHistoryBtn.dataset.historyBound = '1';
        customerHistoryBtn.addEventListener('click', function () {
            const formNameValue = customerEditForm && customerEditForm.name
                ? customerEditForm.name.value.trim()
                : '';
            const nameValue = formNameValue || activeCustomerName;
            openCustomerHistory(nameValue);
        });
    }

    if (customerHistoryClose) {
        customerHistoryClose.addEventListener('click', function () {
            closeCustomerHistoryPanel();
        });
    }

    /* === ΥΠΗΡΕΣΙΕΣ: add / edit / delete ================================ */
    const servicesTable = document.getElementById('services-table');
    const btnNewService = document.getElementById('btn-new-service');
    const serviceEditPanel = document.getElementById('service-edit-panel');
    const serviceEditForm = document.getElementById('service-edit-form');
    const serviceEditTitle = document.getElementById('service-edit-title');
    const serviceCancelEdit = document.getElementById('service-cancel-edit');
    const serviceDeleteBtn = document.getElementById('service-delete');

    let activeServiceRow = null;
    let serviceFormMode = 'edit';

    function getServiceRowData(row) {
        const cells = row.querySelectorAll('span, div');
        return {
            category: ((cells[0] ? cells[0].textContent : '') || '').trim(),
            name: ((cells[1] ? cells[1].textContent : '') || '').trim(),
            duration: ((cells[2] ? cells[2].textContent : '') || '').trim(),
            price: ((cells[3] ? cells[3].textContent : '') || '').trim()
        };
    }

    function setServiceRowData(row, data) {
        const cells = row.querySelectorAll('span, div');
        if (cells[0]) cells[0].textContent = data.category || '';
        if (cells[1]) cells[1].textContent = data.name || '';
        if (cells[2]) cells[2].textContent = data.duration || '';
        if (cells[3]) cells[3].textContent = data.price || '';
    }

    function openServiceEditor(row, mode) {
        activeServiceRow = row;
        serviceFormMode = mode || 'edit';

        const isNew = serviceFormMode === 'new';
        serviceEditTitle.textContent = isNew
            ? 'Νέα υπηρεσία'
            : 'Επεξεργασία υπηρεσίας';

        if (isNew) {
            serviceEditForm.reset();
            serviceDeleteBtn.style.display = 'none';
        } else if (row) {
            const data = getServiceRowData(row);
            serviceEditForm.category.value = data.category || '';
            serviceEditForm.name.value = data.name || '';
            serviceEditForm.duration.value = data.duration || '';
            serviceEditForm.price.value = data.price || '';
            serviceDeleteBtn.style.display = 'inline-flex';
        }

        serviceEditPanel.hidden = false;
        openOverlay();
    }

    function closeServiceEditor() {
        if (serviceEditPanel) {
            serviceEditPanel.hidden = true;
        }
        activeServiceRow = null;
        serviceFormMode = 'edit';
        // overlay handled centrally
    }

    function createServiceRow(data) {
        const row = document.createElement('div');
        row.className = 'table-row';

        const categorySpan = document.createElement('span');
        const nameSpan = document.createElement('span');
        const durationSpan = document.createElement('span');
        const priceSpan = document.createElement('span');

        categorySpan.textContent = data.category || '';
        nameSpan.textContent = data.name || '';
        durationSpan.textContent = data.duration || '';
        priceSpan.textContent = data.price || '';

        row.appendChild(categorySpan);
        row.appendChild(nameSpan);
        row.appendChild(durationSpan);
        row.appendChild(priceSpan);

        attachServiceRowHandler(row);
        servicesTable.appendChild(row);

        return row;
    }

    function attachServiceRowHandler(row) {
        row.style.cursor = 'pointer';
        row.addEventListener('click', function () {
            openServiceEditor(row, 'edit');
        });
    }

    /* === ΡΑΝΤΕΒΟΥ: inspection panel για ημερολόγιο ===================== */
    const appointmentInspectPanel = document.getElementById('appointment-inspect-panel');
    const appointmentInspectForm = document.getElementById('appointment-inspect-form');
    const appointmentDateInput = document.getElementById('appointment-date-input');
    const appointmentTimeInput = document.getElementById('appointment-time-input');
    const appointmentClientInput = document.getElementById('appointment-client-input');
    const appointmentServiceInput = document.getElementById('appointment-service-input');
    const appointmentEmployeeInput = document.getElementById('appointment-employee-input');
    const appointmentStatusInput = document.getElementById('appointment-status-input');
    const appointmentCancelBtn = document.getElementById('appointment-cancel');
    const appointmentDeleteBtn = document.getElementById('appointment-delete');
    const appointmentStackNav = document.getElementById('appointment-stack-nav');
    const appointmentStackPrev = document.getElementById('appointment-stack-prev');
    const appointmentStackNext = document.getElementById('appointment-stack-next');
    const appointmentStackCount = document.getElementById('appointment-stack-count');

    // Keep the inspection panel outside hidden calendar views.
    if (appointmentInspectPanel && editOverlay && editOverlay.parentElement &&
        appointmentInspectPanel.parentElement !== editOverlay.parentElement) {
        editOverlay.parentElement.insertBefore(appointmentInspectPanel, editOverlay);
    }

    const calendarDateInput = document.querySelector('.calendar-date');
    const calendarDayViewContainer = document.querySelector('.calendar-day-view');
    const calendarWeekView = document.querySelector('.calendar-week-view');
    const calendarDayList = document.querySelector('.calendar-day-view .appointments-list');
    const btnNewAppointment = document.getElementById('btn-new-appointment');

    let activeAppointmentElement = null;
    let activeAppointmentContext = null; // 'day' or 'week'
    let appointmentFormMode = 'edit'; // 'edit' or 'new'
    let appointmentStackItems = [];
    let appointmentStackIndex = 0;
    let appointmentStackSource = null;
    let appointmentStackBubble = null;
    let activeAppointmentOriginalData = null;
    let dayAppointmentCards = [];
    let dayAppointmentIndex = 0;

    function parseTimeToMinutes(value) {
        const match = (value || '').trim().match(/^(\d{1,2}):(\d{2})/);
        if (!match) return Number.POSITIVE_INFINITY;
        const hours = Number(match[1]);
        const minutes = Number(match[2]);
        if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return Number.POSITIVE_INFINITY;
        return hours * 60 + minutes;
    }

    function getDayAppointmentListRoot() {
        if (calendarDayList) return calendarDayList;
        if (calendarDayViewContainer) {
            const list = calendarDayViewContainer.querySelector('.appointments-list');
            if (list) return list;
        }
        if (activeAppointmentElement) {
            const list = activeAppointmentElement.closest('.appointments-list');
            if (list) return list;
        }
        return null;
    }

    function isCardVisible(card) {
        if (!card || card.hidden) return false;
        if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
            return true;
        }
        const style = window.getComputedStyle(card);
        return style.display !== 'none' && style.visibility !== 'hidden';
    }

    function getDayAppointmentCards() {
        const list = getDayAppointmentListRoot();
        if (!list) return [];
        const cards = Array.from(list.querySelectorAll('.appointment-card, .calendar-appointment'))
            .filter(isCardVisible);
        const decorated = cards.map((card, index) => {
            const data = getAppointmentDataFromCard(card);
            return {
                card,
                index,
                timeValue: parseTimeToMinutes(data.time)
            };
        });
        decorated.sort((a, b) => {
            if (a.timeValue === b.timeValue) return a.index - b.index;
            if (!Number.isFinite(a.timeValue)) return 1;
            if (!Number.isFinite(b.timeValue)) return -1;
            return a.timeValue - b.timeValue;
        });
        return decorated.map((item) => item.card);
    }

    function syncDayAppointmentNav() {
        if (!activeAppointmentElement) {
            dayAppointmentCards = [];
            dayAppointmentIndex = 0;
            return;
        }
        dayAppointmentCards = getDayAppointmentCards();
        dayAppointmentIndex = Math.max(0, findDayCardIndex(dayAppointmentCards, activeAppointmentElement));
    }

    function getAppointmentDataFromCard(card) {
        if (card.classList.contains('calendar-appointment')) {
            const timeSpan = card.querySelector('.calendar-appointment-time');
            const serviceSpan = card.querySelector('.calendar-appointment-title');
            const clientSpan = card.querySelector('.calendar-appointment-client');

            return {
                time: card.dataset.time || (timeSpan ? timeSpan.textContent.trim() : ''),
                service: card.dataset.service || (serviceSpan ? serviceSpan.textContent.trim() : ''),
                client: card.dataset.client || (clientSpan ? clientSpan.textContent.trim() : ''),
                statusValue: card.dataset.status || '',
                employee: card.dataset.employee || ''
            };
        }

        const timeSpan = card.querySelector('.appointment-time');
        const serviceSpan = card.querySelector('.appointment-service');
        const clientSpan = card.querySelector('.appointment-client');
        const statusSpan = card.querySelector('.appointment-status');

        let statusValue = '';
        if (statusSpan) {
            if (statusSpan.classList.contains('appointment-status--completed')) {
                statusValue = 'completed';
            } else if (statusSpan.classList.contains('appointment-status--pending')) {
                statusValue = 'pending';
            } else if (statusSpan.classList.contains('appointment-status--no-show')) {
                statusValue = 'no-show';
            }
        }

        return {
            time: timeSpan ? timeSpan.textContent.trim() : '',
            service: serviceSpan ? serviceSpan.textContent.trim() : '',
            client: clientSpan ? clientSpan.textContent.trim() : '',
            statusValue: statusValue,
            employee: card.dataset.employee || ''
        };
    }

    function findDayCardIndex(cards, target) {
        if (!target || !cards.length) return 0;
        const directIndex = cards.indexOf(target);
        if (directIndex >= 0) return directIndex;
        const targetData = getAppointmentDataFromCard(target);
        const matchIndex = cards.findIndex((card) => {
            const data = getAppointmentDataFromCard(card);
            return data.time === targetData.time &&
                data.service === targetData.service &&
                data.client === targetData.client &&
                data.employee === targetData.employee;
        });
        return matchIndex >= 0 ? matchIndex : 0;
    }


    function setAppointmentFormFields(data) {
        if (appointmentTimeInput) {
            appointmentTimeInput.value = data.time || '';
        }
        if (appointmentClientInput) {
            appointmentClientInput.value = data.client || '';
        }
        if (appointmentServiceInput) {
            appointmentServiceInput.value = data.service || '';
        }
        if (appointmentEmployeeInput) {
            appointmentEmployeeInput.value = data.employee || '';
        }
        if (appointmentStatusInput) {
            appointmentStatusInput.value = data.statusValue || '';
        }
    }

    function resetAppointmentStackState() {
        appointmentStackItems = [];
        appointmentStackIndex = 0;
        appointmentStackSource = null;
        appointmentStackBubble = null;
        updateAppointmentStackNav();
    }

    function updateAppointmentStackNav() {
        if (!appointmentStackNav) return;
        if (activeAppointmentContext === 'day' && appointmentFormMode === 'edit') {
            syncDayAppointmentNav();
        }
        const isStackActive = appointmentStackItems.length > 1 && appointmentFormMode === 'edit';
        const isDayListActive = !isStackActive &&
            activeAppointmentContext === 'day' &&
            appointmentFormMode === 'edit' &&
            dayAppointmentCards.length > 1;
        const isActive = isStackActive || isDayListActive;
        appointmentStackNav.hidden = !isActive;
        appointmentStackNav.style.display = isActive ? 'flex' : 'none';

        if (!isActive) return;

        if (isStackActive) {
            if (appointmentStackCount) {
                appointmentStackCount.textContent = `${appointmentStackIndex + 1} / ${appointmentStackItems.length}`;
            }
            if (appointmentStackPrev) {
                appointmentStackPrev.disabled = appointmentStackIndex === 0;
            }
            if (appointmentStackNext) {
                appointmentStackNext.disabled = appointmentStackIndex >= appointmentStackItems.length - 1;
            }
            return;
        }

        if (appointmentStackCount) {
            appointmentStackCount.textContent = `${dayAppointmentIndex + 1} / ${dayAppointmentCards.length}`;
        }
        if (appointmentStackPrev) {
            appointmentStackPrev.disabled = dayAppointmentIndex === 0;
        }
        if (appointmentStackNext) {
            appointmentStackNext.disabled = dayAppointmentIndex >= dayAppointmentCards.length - 1;
        }
    }

    function updateInspectorFromDayCard(card) {
        if (!card) return;
        const data = getAppointmentDataFromCard(card);
        activeAppointmentElement = card;
        activeAppointmentContext = 'day';
        appointmentFormMode = 'edit';
        appointmentStackItems = [];
        appointmentStackIndex = 0;
        appointmentStackSource = null;
        appointmentStackBubble = null;
        setAppointmentFormFields(data);

        const elementDate = card && card.dataset ? card.dataset.date : '';
        const fallbackDate = calendarDateInput && calendarDateInput.value ? calendarDateInput.value : '';
        if (appointmentDateInput) {
            appointmentDateInput.value = elementDate || fallbackDate;
        }
        activeAppointmentOriginalData = {
            ...data,
            date: elementDate || fallbackDate
        };

        if (typeof window !== 'undefined' && typeof window.updateEmployeeSelectForService === 'function') {
            window.updateEmployeeSelectForService();
        }
        updateAppointmentStackNav();
    }

    function navigateDayAppointments(delta) {
        if (activeAppointmentContext !== 'day') return;
        const cards = getDayAppointmentCards();
        if (cards.length <= 1) return;
        const currentIndex = findDayCardIndex(cards, activeAppointmentElement);
        const nextIndex = currentIndex + delta;
        if (nextIndex < 0 || nextIndex >= cards.length) return;
        const nextCard = cards[nextIndex];
        if (!nextCard) return;
        dayAppointmentCards = cards;
        dayAppointmentIndex = nextIndex;
        updateInspectorFromDayCard(nextCard);
    }

    function getStackDataFromElement(element) {
        if (!element) return null;
        const bubble = element.querySelector('.calendar-appointment-bubble, .calendar-slot-bubble');
        let raw = element.dataset && element.dataset.appointments ? element.dataset.appointments : '';
        if (!raw && bubble && bubble.dataset) {
            raw = bubble.dataset.appointments || '';
        }
        if (!raw) return null;

        const items = parseOverlapData(raw).map((item) => ({
            time: item.time || '',
            service: item.service || '',
            client: item.client || '',
            statusValue: item.status || '',
            employee: item.employee || '',
            date: element && element.dataset ? element.dataset.date || '' : ''
        }));

        return items.length ? { items, bubble } : null;
    }

    function setAppointmentStackIndex(index) {
        if (!appointmentStackItems.length) return;
        appointmentStackIndex = Math.max(0, Math.min(index, appointmentStackItems.length - 1));
        setAppointmentFormFields(appointmentStackItems[appointmentStackIndex] || {});
        updateAppointmentStackNav();
    }

    function findStackIndexForElement(element, context, items) {
        if (!element || !items.length) return 0;
        const elementData = context === 'week'
            ? getAppointmentDataFromWeekSlot(element)
            : getAppointmentDataFromCard(element);

        const matchIndex = items.findIndex((item) => {
            if (!elementData) return false;
            const timeMatch = item.time === elementData.time;
            const serviceMatch = item.service === elementData.service;
            if (elementData.client) {
                const clientMatch = item.client === elementData.client;
                if (elementData.employee) {
                    return timeMatch && serviceMatch && clientMatch && item.employee === elementData.employee;
                }
                return timeMatch && serviceMatch && clientMatch;
            }
            if (elementData.employee) {
                return timeMatch && serviceMatch && item.employee === elementData.employee;
            }
            return timeMatch && serviceMatch;
        });

        return matchIndex >= 0 ? matchIndex : 0;
    }

    function updateAppointmentStackSource() {
        if (!appointmentStackSource) return;
        const raw = appointmentStackItems.map((item) => {
            const parts = [
                item.time || '',
                item.service || '',
                item.client || '',
                item.statusValue || '',
                item.employee || ''
            ];
            return parts.join('|');
        }).join(';');

        appointmentStackSource.dataset.appointments = raw;
        if (appointmentStackBubble) {
            appointmentStackBubble.dataset.appointments = raw;
            appointmentStackBubble.textContent = String(appointmentStackItems.length);
        }
    }

    function applyAppointmentDataToCard(card, data) {
        if (card.classList.contains('calendar-appointment')) {
            const timeSpan = card.querySelector('.calendar-appointment-time');
            const serviceSpan = card.querySelector('.calendar-appointment-title');
            const clientSpan = card.querySelector('.calendar-appointment-client');

            card.dataset.time = data.time || '';
            card.dataset.service = data.service || '';
            card.dataset.client = data.client || '';
            card.dataset.status = data.statusValue || '';
            card.dataset.employee = data.employee || '';
            if (data.date) {
                card.dataset.date = data.date;
            }

            if (timeSpan) timeSpan.textContent = data.time || '';
            if (serviceSpan) serviceSpan.textContent = data.service || '';
            if (clientSpan) clientSpan.textContent = data.client || '';

            card.classList.remove('calendar-appointment--completed', 'calendar-appointment--pending', 'calendar-appointment--no-show');
            if (data.statusValue === 'completed') {
                card.classList.add('calendar-appointment--completed');
            } else if (data.statusValue === 'pending') {
                card.classList.add('calendar-appointment--pending');
            } else if (data.statusValue === 'no-show') {
                card.classList.add('calendar-appointment--no-show');
            }

            return;
        }

        const timeSpan = card.querySelector('.appointment-time');
        const serviceSpan = card.querySelector('.appointment-service');
        const clientSpan = card.querySelector('.appointment-client');
        const statusSpan = card.querySelector('.appointment-status');

        if (timeSpan) timeSpan.textContent = data.time || '';
        if (serviceSpan) serviceSpan.textContent = data.service || '';
        if (clientSpan) clientSpan.textContent = data.client || '';
        card.dataset.employee = data.employee || '';
        if (data.date) {
            card.dataset.date = data.date;
        }

        if (statusSpan) {
            statusSpan.classList.remove('appointment-status--completed', 'appointment-status--pending', 'appointment-status--no-show');

            if (data.statusValue === 'completed') {
                statusSpan.classList.add('appointment-status--completed');
                statusSpan.textContent = 'Ολοκληρώθηκε';
            } else if (data.statusValue === 'pending') {
                statusSpan.classList.add('appointment-status--pending');
                statusSpan.textContent = 'Σε αναμονή';
            } else if (data.statusValue === 'no-show') {
                statusSpan.classList.add('appointment-status--no-show');
                statusSpan.textContent = 'No show';
            } else {
                statusSpan.textContent = '';
            }
        }
    }

    function getWeekSlotText(slot) {
        if (!slot) return { time: '', service: '' };
        const textNodes = Array.from(slot.childNodes)
            .filter((node) => node.nodeType === Node.TEXT_NODE)
            .map((node) => node.textContent.trim())
            .filter(Boolean);

        return {
            time: textNodes[0] || '',
            service: textNodes[1] || ''
        };
    }

    function getAppointmentDataFromWeekSlot(slot) {
        const textData = getWeekSlotText(slot);
        return {
            time: textData.time || '',
            service: textData.service || '',
            client: slot.dataset.client || '',
            statusValue: slot.dataset.status || '',
            employee: slot.dataset.employee || '',
            date: slot.dataset.date || ''
        };
    }

    function applyAppointmentDataToWeekSlot(slot, data) {
        const time = data.time || '';
        const service = data.service || '';

        if (!time && !service) {
            slot.textContent = '';
            slot.dataset.client = '';
            slot.dataset.status = '';
            slot.dataset.employee = '';
            return;
        }

        slot.dataset.client = data.client || '';
        slot.dataset.status = data.statusValue || '';
        slot.dataset.employee = data.employee || '';
        if (data.date) {
            slot.dataset.date = data.date;
        }

        // recreate content with potential line break
        slot.innerHTML = '';
        const timeNode = document.createTextNode(time);
        slot.appendChild(timeNode);

        if (service) {
            const br = document.createElement('br');
            slot.appendChild(br);
            const serviceNode = document.createTextNode(service);
            slot.appendChild(serviceNode);
        }
    }

    function createDayAppointmentCard(data) {
        if (!calendarDayList) return null;

        const card = document.createElement('article');
        card.className = 'appointment-card';
        card.innerHTML = `
            <div class="appointment-main">
                <span class="appointment-time"></span>
                <span class="appointment-service"></span>
            </div>
            <div class="appointment-meta">
                <span class="appointment-client"></span>
                <span class="appointment-status"></span>
            </div>
        `.trim();

        calendarDayList.appendChild(card);
        applyAppointmentDataToCard(card, data);
        return card;
    }

    function buildOverlapRaw(items) {
        return items.map((item) => ([
            item.time || '',
            item.service || '',
            item.client || '',
            item.statusValue || '',
            item.employee || ''
        ].join('|'))).join(';');
    }

    function renderWeekSlotContent(slot, item, raw, count) {
        if (!slot || !item) return;
        slot.innerHTML = '';
        slot.classList.add('calendar-slot--busy');
        slot.classList.toggle('calendar-slot--stack', count > 1);

        slot.dataset.client = item.client || '';
        slot.dataset.status = item.statusValue || '';
        slot.dataset.employee = item.employee || '';
        if (item.date) {
            slot.dataset.date = item.date;
        }

        const timeNode = document.createTextNode(item.time || '');
        slot.appendChild(timeNode);

        if (item.service) {
            slot.appendChild(document.createElement('br'));
            slot.appendChild(document.createTextNode(item.service));
        }

        if (count > 1) {
            slot.dataset.appointments = raw;
            const bubble = document.createElement('span');
            bubble.className = 'calendar-slot-bubble';
            bubble.dataset.appointments = raw;
            bubble.textContent = String(count);
            slot.appendChild(bubble);
        } else {
            delete slot.dataset.appointments;
        }
    }

    function addAppointmentToWeekColumn(column, data) {
        if (!column) return;
        const timeKey = (data.time || '').trim();
        if (!timeKey) return;

        const slots = Array.from(column.querySelectorAll('.calendar-slot--busy'));
        const existing = slots.find((slot) => getWeekSlotText(slot).time === timeKey);
        if (!existing) {
            const slot = document.createElement('div');
            slot.className = 'calendar-slot calendar-slot--busy';
            renderWeekSlotContent(slot, data, '', 1);
            column.appendChild(slot);
            return;
        }

        let items = [];
        const raw = existing.dataset ? existing.dataset.appointments : '';
        if (raw) {
            items = parseOverlapData(raw).map((item) => ({
                time: item.time || '',
                service: item.service || '',
                client: item.client || '',
                statusValue: item.status || '',
                employee: item.employee || ''
            }));
        } else {
            const existingData = getAppointmentDataFromWeekSlot(existing);
            items = [existingData];
        }

        items.push({
            time: data.time || '',
            service: data.service || '',
            client: data.client || '',
            statusValue: data.statusValue || '',
            employee: data.employee || '',
            date: data.date || existing.dataset.date || ''
        });

        const rawUpdated = buildOverlapRaw(items);
        renderWeekSlotContent(existing, items[0], rawUpdated, items.length);
    }

    function removeAppointmentFromWeekColumn(column, data) {
        if (!column) return;
        const timeKey = (data.time || '').trim();
        if (!timeKey) return;

        const slots = Array.from(column.querySelectorAll('.calendar-slot--busy'));
        const slot = slots.find((s) => getWeekSlotText(s).time === timeKey);
        if (!slot) return;

        const raw = slot.dataset ? slot.dataset.appointments : '';
        if (raw) {
            const items = parseOverlapData(raw).map((item) => ({
                time: item.time || '',
                service: item.service || '',
                client: item.client || '',
                statusValue: item.status || '',
                employee: item.employee || ''
            }));

            const remaining = items.filter((item) => !(
                item.time === data.time &&
                item.service === data.service &&
                item.client === data.client &&
                item.employee === data.employee
            ));

            if (!remaining.length) {
                slot.remove();
                return;
            }

            if (remaining.length === 1) {
                renderWeekSlotContent(slot, remaining[0], '', 1);
                return;
            }

            const rawUpdated = buildOverlapRaw(remaining);
            renderWeekSlotContent(slot, remaining[0], rawUpdated, remaining.length);
            return;
        }

        const slotData = getAppointmentDataFromWeekSlot(slot);
        const matches = slotData.time === data.time &&
            slotData.service === data.service &&
            slotData.client === data.client &&
            slotData.employee === data.employee;
        if (matches) {
            slot.remove();
        }
    }

    function applyWeekDates(baseDate) {
        if (!calendarWeekView || !baseDate) return;
        const columns = Array.from(calendarWeekView.querySelectorAll('.calendar-column'));
        if (!columns.length) return;

        const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
        const weekday = base.getDay();
        const daysFromMonday = (weekday + 6) % 7;
        const monday = new Date(base);
        monday.setDate(base.getDate() - daysFromMonday);

        columns.forEach((column, index) => {
            const columnDate = new Date(monday);
            columnDate.setDate(monday.getDate() + index);
            const dateValue = `${columnDate.getFullYear()}-${String(columnDate.getMonth() + 1).padStart(2, '0')}-${String(columnDate.getDate()).padStart(2, '0')}`;
            column.dataset.date = dateValue;
            column.querySelectorAll('.calendar-slot').forEach((slot) => {
                slot.dataset.date = dateValue;
            });
        });
    }

    function getWeekColumnForDate(baseDate) {
        if (!calendarWeekView || !baseDate) return null;
        const columns = Array.from(calendarWeekView.querySelectorAll('.calendar-column'));
        if (!columns.length) return null;

        const weekday = baseDate.getDay(); // 0=Sunday
        if (weekday === 0) return null;
        const index = (weekday + 6) % 7; // Monday=0 ... Saturday=5
        return columns[index] || null;
    }

    function collectWeekColumnAppointments(column) {
        if (!column) return [];
        const slots = Array.from(column.querySelectorAll('.calendar-slot--busy'));
        const items = [];

        slots.forEach((slot) => {
            const raw = slot.dataset ? slot.dataset.appointments : '';
            if (raw) {
                parseOverlapData(raw).forEach((item) => {
                    items.push({
                        time: item.time || '',
                        service: item.service || '',
                        client: item.client || '',
                        statusValue: item.status || '',
                        employee: item.employee || ''
                    });
                });
                return;
            }

            const parts = slot.textContent.split('\n').map(p => p.trim()).filter(Boolean);
            items.push({
                time: parts[0] || '',
                service: parts[1] || '',
                client: slot.dataset.client || '',
                statusValue: slot.dataset.status || '',
                employee: slot.dataset.employee || '',
                date: slot.dataset.date || ''
            });
        });

        return items;
    }

    function renderDayViewForSelectedDate() {
        if (!calendarDayList) return;
        calendarDayList.innerHTML = '';

        const baseDate = calendarDateInput && calendarDateInput.value
            ? new Date(calendarDateInput.value + 'T00:00:00')
            : new Date();

        applyWeekDates(baseDate);
        const column = getWeekColumnForDate(baseDate);
        if (!column) return;

        let items = collectWeekColumnAppointments(column);
        const scheduleSelect = document.getElementById('calendar-schedule-select');
        const activeKey = scheduleSelect ? scheduleSelect.value : 'all';
        if (activeKey && activeKey !== 'all') {
            items = items.filter((item) => item.employee === activeKey);
        }

        items.forEach((item) => {
            createDayAppointmentCard({
                ...item,
                date: item.date || `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`
            });
        });

        if (typeof window !== 'undefined' && typeof window.applyOfflineToDayList === 'function') {
            const dateValue = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`;
            window.applyOfflineToDayList(dateValue);
        }
    }

    if (typeof window !== 'undefined') {
        window.renderDayViewForSelectedDate = renderDayViewForSelectedDate;
    }

    renderDayViewForSelectedDate();

    function openAppointmentInspector(element, context, mode) {
        if (!appointmentInspectPanel || !appointmentInspectForm) return;

        activeAppointmentElement = element;
        activeAppointmentContext = context;
        appointmentFormMode = mode || 'edit';
        resetAppointmentStackState();

        let data = {
            time: '',
            service: '',
            client: '',
            statusValue: '',
            employee: ''
        };

        if (appointmentFormMode === 'edit' && element) {
            const stackData = getStackDataFromElement(element);
            if (stackData && stackData.items.length > 1) {
                appointmentStackItems = stackData.items;
                appointmentStackSource = element;
                appointmentStackBubble = stackData.bubble;
                appointmentStackIndex = findStackIndexForElement(element, context, appointmentStackItems);
                data = appointmentStackItems[appointmentStackIndex] || data;
                dayAppointmentCards = [];
                dayAppointmentIndex = 0;
            } else if (context === 'day') {
                data = getAppointmentDataFromCard(element);
                syncDayAppointmentNav();
            } else if (context === 'week') {
                data = getAppointmentDataFromWeekSlot(element);
                dayAppointmentCards = [];
                dayAppointmentIndex = 0;
            }
        } else {
            dayAppointmentCards = [];
            dayAppointmentIndex = 0;
        }

        if (context === 'day' && appointmentFormMode === 'edit') {
            activeAppointmentOriginalData = {
                ...data,
                date: (element && element.dataset ? element.dataset.date : '') ||
                    (calendarDateInput && calendarDateInput.value ? calendarDateInput.value : '')
            };
        } else {
            activeAppointmentOriginalData = null;
        }

        if (appointmentDateInput) {
            const elementDate = element && element.dataset ? element.dataset.date : '';
            appointmentDateInput.value = elementDate
                ? elementDate
                : (calendarDateInput && calendarDateInput.value ? calendarDateInput.value : '');
        }
        setAppointmentFormFields(data);
        if (typeof window !== 'undefined' && typeof window.updateEmployeeSelectForService === 'function') {
            window.updateEmployeeSelectForService();
        }
        updateAppointmentStackNav();

        appointmentInspectPanel.hidden = false;
        appointmentInspectPanel.style.display = 'block';
        openOverlay();
    }

    function closeAppointmentInspector() {
        if (appointmentInspectPanel) {
            appointmentInspectPanel.hidden = true;
            appointmentInspectPanel.style.display = 'none';
        }
        activeAppointmentElement = null;
        activeAppointmentContext = null;
        appointmentFormMode = 'edit';
        activeAppointmentOriginalData = null;
        resetAppointmentStackState();
        dayAppointmentCards = [];
        dayAppointmentIndex = 0;

        if (isHidden(customerEditPanel) && isHidden(serviceEditPanel) &&
            isHidden(overlapPanel) && isHidden(customerHistoryPanel)) {
            closeOverlay();
        }
    }

    if (appointmentInspectPanel && appointmentInspectForm) {
        // DAY VIEW: event delegation so that new cards also work
        if (calendarDayViewContainer) {
            calendarDayViewContainer.addEventListener('click', function (e) {
                if (e.target.closest('.calendar-appointment-bubble')) return;
                const card = e.target.closest('.appointment-card, .calendar-appointment');
                if (!card) return;
                openAppointmentInspector(card, 'day', 'edit');
            });
        }

        // WEEK VIEW: busy slots
        const busyWeekSlots = document.querySelectorAll('.calendar-week-view .calendar-slot--busy');
        busyWeekSlots.forEach(slot => {
            slot.style.cursor = 'pointer';
            slot.addEventListener('click', function (e) {
                if (e.target && e.target.closest('.calendar-slot-bubble')) return;
                openAppointmentInspector(slot, 'week', 'edit');
            });
        });

        // "+" manual appointment button (day-based)
        if (btnNewAppointment) {
            btnNewAppointment.addEventListener('click', function () {
                const activeSection = document.querySelector('.admin-section.admin-section--visible');
                const activeKey = activeSection ? activeSection.dataset.section : 'calendar';

                if (activeKey === 'customers') {
                    if (typeof openCustomerEditor === 'function') {
                        openCustomerEditor(null, 'new');
                    }
                } else if (activeKey === 'settings') {
                    if (typeof openServiceEditor === 'function') {
                        openServiceEditor(null, 'new');
                    }
                } else {
                    // default: calendar → νέο ραντεβού στην ημερήσια λίστα
                    openAppointmentInspector(null, 'day', 'new');
                }
            });
        }

        // Submit / save
        appointmentInspectForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const data = {
                time: appointmentTimeInput ? appointmentTimeInput.value.trim() : '',
                client: appointmentClientInput ? appointmentClientInput.value.trim() : '',
                service: appointmentServiceInput ? appointmentServiceInput.value.trim() : '',
                statusValue: appointmentStatusInput ? appointmentStatusInput.value : '',
                employee: appointmentEmployeeInput ? appointmentEmployeeInput.value : ''
            };
            if (calendarDateInput && calendarDateInput.value) {
                data.date = calendarDateInput.value;
            }
            const scheduleSelect = document.getElementById('calendar-schedule-select');
            const scheduleKey = scheduleSelect ? scheduleSelect.value : 'all';
            if (!data.employee && scheduleKey && scheduleKey !== 'all') {
                data.employee = scheduleKey;
            }
            if (!data.employee) {
                data.employee = 'e1';
            }
            const formDateValue = (appointmentDateInput && appointmentDateInput.value)
                ? appointmentDateInput.value
                : (calendarDateInput && calendarDateInput.value ? calendarDateInput.value : '');

            if (typeof window !== 'undefined' && typeof window.isEmployeeOfflineForDate === 'function') {
                if (data.employee && formDateValue && window.isEmployeeOfflineForDate(data.employee, formDateValue)) {
                    alert('Ο εργαζόμενος είναι offline για αυτή την ημερομηνία.');
                    return;
                }
            }

            if (appointmentFormMode === 'edit' && appointmentStackItems.length > 1 && appointmentStackSource) {
                appointmentStackItems[appointmentStackIndex] = data;
                updateAppointmentStackSource();
                renderDayViewForSelectedDate();
                closeAppointmentInspector();
                return;
            }

            if (activeAppointmentContext === 'day') {
                const dateValue = data.date
                    ? data.date
                    : (appointmentDateInput && appointmentDateInput.value ? appointmentDateInput.value : '');
                const targetDate = dateValue ? new Date(dateValue + 'T00:00:00') : new Date();
                applyWeekDates(targetDate);
                const targetColumn = getWeekColumnForDate(targetDate);

                if (appointmentFormMode === 'edit' && activeAppointmentOriginalData) {
                    const originalDate = activeAppointmentOriginalData.date || dateValue;
                    const originalColumnDate = originalDate ? new Date(originalDate + 'T00:00:00') : targetDate;
                    const originalColumn = getWeekColumnForDate(originalColumnDate);
                    removeAppointmentFromWeekColumn(originalColumn, activeAppointmentOriginalData);
                }

                addAppointmentToWeekColumn(targetColumn, {
                    ...data,
                    date: dateValue || (targetColumn && targetColumn.dataset ? targetColumn.dataset.date : '')
                });

                renderDayViewForSelectedDate();
            } else if (activeAppointmentContext === 'week' && activeAppointmentElement) {
                applyAppointmentDataToWeekSlot(activeAppointmentElement, data);
                renderDayViewForSelectedDate();
            }

            closeAppointmentInspector();
        });

        if (appointmentStackPrev) {
            appointmentStackPrev.addEventListener('click', function () {
                if (appointmentStackItems.length > 1) {
                    setAppointmentStackIndex(appointmentStackIndex - 1);
                    return;
                }
                navigateDayAppointments(-1);
            });
        }

        if (appointmentStackNext) {
            appointmentStackNext.addEventListener('click', function () {
                if (appointmentStackItems.length > 1) {
                    setAppointmentStackIndex(appointmentStackIndex + 1);
                    return;
                }
                navigateDayAppointments(1);
            });
        }

        if (appointmentCancelBtn) {
            appointmentCancelBtn.addEventListener('click', function () {
                closeAppointmentInspector();
            });
        }

        if (appointmentDeleteBtn) {
            appointmentDeleteBtn.addEventListener('click', function () {
                if (!activeAppointmentElement) {
                    closeAppointmentInspector();
                    return;
                }

                if (appointmentStackItems.length > 1 && appointmentStackSource) {
                    if (!confirm('Delete this appointment?')) {
                        return;
                    }

                    appointmentStackItems.splice(appointmentStackIndex, 1);

                    if (appointmentStackItems.length > 1) {
                        updateAppointmentStackSource();
                        appointmentStackIndex = Math.min(appointmentStackIndex, appointmentStackItems.length - 1);
                        setAppointmentStackIndex(appointmentStackIndex);
                        return;
                    }

                    if (appointmentStackItems.length === 1) {
                        const remaining = appointmentStackItems[0];
                        appointmentStackSource.dataset.appointments = '';
                        if (appointmentStackBubble) {
                            appointmentStackBubble.remove();
                            appointmentStackBubble = null;
                        }
                        appointmentStackSource.classList.remove('calendar-appointment--stack', 'calendar-slot--stack');
                        if (activeAppointmentContext === 'day') {
                            applyAppointmentDataToCard(appointmentStackSource, remaining);
                        } else if (activeAppointmentContext === 'week') {
                            applyAppointmentDataToWeekSlot(appointmentStackSource, remaining);
                        }
                        resetAppointmentStackState();
                        setAppointmentFormFields(remaining);
                        return;
                    }

                    if (activeAppointmentContext === 'day') {
                        activeAppointmentElement.remove();
                    } else if (activeAppointmentContext === 'week') {
                        activeAppointmentElement.classList.remove('calendar-slot--busy');
                        activeAppointmentElement.classList.add('calendar-slot--free');
                        const currentTime = appointmentTimeInput ? appointmentTimeInput.value.trim() : '';
                        activeAppointmentElement.textContent = currentTime || '';
                    }
                    closeAppointmentInspector();
                    return;
                }

                if (confirm('Να διαγραφεί το ραντεβού;')) {
                    if (activeAppointmentContext === 'day') {
                        activeAppointmentElement.remove();
                    } else if (activeAppointmentContext === 'week') {
                        // μετατρέπουμε το slot σε "free"
                        activeAppointmentElement.classList.remove('calendar-slot--busy');
                        activeAppointmentElement.classList.add('calendar-slot--free');
                        // κρατάμε μόνο την ώρα (αν υπάρχει)
                        const currentTime = appointmentTimeInput ? appointmentTimeInput.value.trim() : '';
                        activeAppointmentElement.textContent = currentTime || '';
                    }
                    closeAppointmentInspector();
                }
            });
        }
    }

    const calendarSection = document.querySelector('.admin-section[data-section="calendar"]');
    if (calendarSection) {
        calendarSection.addEventListener('click', function (e) {
            const bubble = e.target.closest('.calendar-appointment-bubble, .calendar-slot-bubble');
            if (!bubble) return;
            e.stopPropagation();
            const rawData = bubble.dataset ? bubble.dataset.appointments : '';
            if (!rawData) return;
            openOverlapPanel(parseOverlapData(rawData));
        });
    }

    if (overlapClose) {
        overlapClose.addEventListener('click', function () {
            closeOverlapPanel();
        });
    }

    if (overlapPrev) {
        overlapPrev.addEventListener('click', function () {
            if (overlapIndex > 0) {
                overlapIndex -= 1;
                renderOverlapDetail();
            }
        });
    }

    if (overlapNext) {
        overlapNext.addEventListener('click', function () {
            if (overlapIndex < overlapItems.length - 1) {
                overlapIndex += 1;
                renderOverlapDetail();
            }
        });
    }

    if (overlapList) {
        overlapList.addEventListener('click', function (e) {
            const row = e.target.closest('.calendar-overlap-item');
            if (!row || row.dataset.index === undefined) return;
            overlapIndex = Number(row.dataset.index);
            renderOverlapDetail();
        });
    }

    if (servicesTable && serviceEditPanel && serviceEditForm) {
        const existingServiceRows = servicesTable.querySelectorAll('.table-row');
        existingServiceRows.forEach(attachServiceRowHandler);

        if (btnNewService) {
            btnNewService.addEventListener('click', function () {
                openServiceEditor(null, 'new');
            });
        }

        serviceEditForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const data = {
                category: serviceEditForm.category.value.trim(),
                name: serviceEditForm.name.value.trim(),
                duration: serviceEditForm.duration.value.trim(),
                price: serviceEditForm.price.value.trim()
            };

            if (serviceFormMode === 'edit' && activeServiceRow) {
                setServiceRowData(activeServiceRow, data);
            } else {
                const newRow = createServiceRow(data);
                activeServiceRow = newRow;
            }

            serviceEditPanel.hidden = true;
            if (isHidden(appointmentInspectPanel) && isHidden(customerEditPanel) &&
                isHidden(overlapPanel) && isHidden(customerHistoryPanel)) {
                closeOverlay();
            }
        });

        serviceCancelEdit.addEventListener('click', function () {
            serviceEditPanel.hidden = true;
            if (isHidden(appointmentInspectPanel) && isHidden(customerEditPanel) &&
                isHidden(overlapPanel) && isHidden(customerHistoryPanel)) {
                closeOverlay();
            }
        });

        serviceDeleteBtn.addEventListener('click', function () {
            if (activeServiceRow && confirm('Να διαγραφεί η υπηρεσία;')) {
                activeServiceRow.remove();
                serviceEditPanel.hidden = true;
                if (isHidden(appointmentInspectPanel) && isHidden(customerEditPanel) &&
                    isHidden(overlapPanel) && isHidden(customerHistoryPanel)) {
                    closeOverlay();
                }
            }
        });
    }
});

// === SETTINGS: tabs + employee services ===================
function initAccessGate() {
    if (typeof window !== 'undefined' && window.__accessGateInit) return;
    const accessGate = document.getElementById('access-gate');
    if (!accessGate) return;
    if (typeof window !== 'undefined') window.__accessGateInit = true;

    const accessForm = document.getElementById('access-gate-form');
    const accessInput = document.getElementById('access-gate-input');
    const accessError = document.getElementById('access-gate-error');
    const accessTarget = document.querySelector('.admin-page');
    const accessPassword = 'demo123';

    function lockAccess() {
        document.body.classList.add('access-locked');
        accessGate.hidden = false;
        if (accessTarget) accessTarget.setAttribute('aria-hidden', 'true');
        if (accessInput) accessInput.focus();
    }

    function unlockAccess() {
        document.body.classList.remove('access-locked');
        accessGate.hidden = true;
        if (accessTarget) accessTarget.removeAttribute('aria-hidden');
        if (accessInput) accessInput.value = '';
        if (accessError) accessError.hidden = true;
    }

    let isUnlocked = false;

    if (isUnlocked) {
        unlockAccess();
    } else {
        lockAccess();
    }

    if (accessForm) {
        accessForm.addEventListener('submit', function (event) {
            event.preventDefault();
            if (!accessInput) return;
            const value = accessInput.value.trim();
            if (value === accessPassword) {
                unlockAccess();
            } else {
                if (accessError) accessError.hidden = false;
                accessInput.value = '';
                accessInput.focus();
            }
        });
    }

    if (accessInput) {
        accessInput.addEventListener('input', function () {
            if (accessError) accessError.hidden = true;
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccessGate);
} else {
    initAccessGate();
}

document.addEventListener('DOMContentLoaded', function () {
    var settingsSection = document.querySelector('.admin-section[data-section="settings"]');
    if (!settingsSection) return;

    var servicesTable = document.getElementById('services-table');
    var appointmentServiceInput = document.getElementById('appointment-service-input');
    var appointmentEmployeeInput = document.getElementById('appointment-employee-input');
    var btnAddEmployee = document.getElementById('btn-add-employee');
    var employeeEditPanel = document.getElementById('employee-edit-panel');
    var employeeEditForm = document.getElementById('employee-edit-form');
    var employeeNameInput = document.getElementById('employee-name-input');
    var employeeCancelEdit = document.getElementById('employee-cancel-edit');
    var employeeServicesPicker = document.getElementById('employee-services-picker');
    var employeeOfflinePanel = document.getElementById('employee-offline-panel');
    var employeeOfflineForm = document.getElementById('employee-offline-form');
    var employeeOfflineName = document.getElementById('employee-offline-name');
    var employeeOfflineKeyInput = document.getElementById('employee-offline-key');
    var employeeOfflineStartInput = document.getElementById('employee-offline-start');
    var employeeOfflineEndInput = document.getElementById('employee-offline-end');
    var employeeOfflineCancel = document.getElementById('employee-offline-cancel');
    var editOverlay = document.getElementById('global-edit-overlay');
    var appointmentInspectPanel = document.getElementById('appointment-inspect-panel');
    var customerEditPanel = document.getElementById('customer-edit-panel');
    var customerHistoryPanel = document.getElementById('customer-history-panel');
    var serviceEditPanel = document.getElementById('service-edit-panel');
    var overlapPanel = document.getElementById('calendar-overlap-panel');
    var serviceListCache = [];
    var settingsListenersBound = false;

    if (employeeEditPanel && editOverlay && editOverlay.parentElement &&
        employeeEditPanel.parentElement !== editOverlay.parentElement) {
        editOverlay.parentElement.insertBefore(employeeEditPanel, editOverlay);
    }

    function collectServiceNames() {
        if (!servicesTable) return [];
        var rows = Array.from(servicesTable.querySelectorAll('.table-row'));
        return rows.map(function (row) {
            var cells = row.querySelectorAll('span, div');
            var name = cells[1] ? cells[1].textContent.trim() : '';
            return name;
        }).filter(Boolean);
    }

    function parseServiceList(value) {
        return (value || '')
            .split('|')
            .map(function (item) { return item.trim(); })
            .filter(Boolean);
    }

    function findServiceMatch(inputValue) {
        var cleaned = (inputValue || '').trim().toLowerCase();
        if (!cleaned) return '';

        var exact = serviceListCache.find(function (name) {
            return name.toLowerCase() === cleaned;
        });
        if (exact) return exact;

        var partial = serviceListCache.find(function (name) {
            var lower = name.toLowerCase();
            return cleaned.includes(lower) || lower.includes(cleaned);
        });
        return partial || '';
    }

    function parseOfflineRanges(value) {
        if (!value) return [];
        return value.split(';').map(function (entry) {
            var parts = entry.split('|').map(function (p) { return p.trim(); });
            var start = parts[0] || '';
            var end = parts[1] || parts[0] || '';
            if (!start) return null;
            if (end && end < start) {
                var swap = start;
                start = end;
                end = swap;
            }
            return { start: start, end: end || start };
        }).filter(Boolean);
    }

    function serializeOfflineRanges(ranges) {
        return (ranges || []).map(function (range) {
            return [range.start || '', range.end || range.start || ''].join('|');
        }).join(';');
    }

    function mergeOfflineRanges(ranges) {
        if (!ranges.length) return [];
        var sorted = ranges.slice().sort(function (a, b) {
            return a.start.localeCompare(b.start);
        });
        var merged = [sorted[0]];
        sorted.slice(1).forEach(function (range) {
            var last = merged[merged.length - 1];
            if (range.start <= last.end) {
                if (range.end > last.end) {
                    last.end = range.end;
                }
                return;
            }
            merged.push(range);
        });
        return merged;
    }

    function getEmployeeCardByKey(key) {
        if (!key) return null;
        return settingsSection.querySelector('.settings-employee-card[data-employee="' + key + '"]');
    }

    function addOfflineRangeToCard(card, start, end) {
        if (!card || !start) return;
        var ranges = parseOfflineRanges(card.dataset.offline || '');
        var normalized = {
            start: start,
            end: end || start
        };
        if (normalized.end && normalized.end < normalized.start) {
            var swap = normalized.start;
            normalized.start = normalized.end;
            normalized.end = swap;
        }
        ranges.push(normalized);
        var merged = mergeOfflineRanges(ranges);
        card.dataset.offline = serializeOfflineRanges(merged);
    }

    function isEmployeeOfflineForDate(key, dateValue) {
        if (!key || !dateValue) return false;
        var card = getEmployeeCardByKey(key);
        if (!card) return false;
        var ranges = parseOfflineRanges(card.dataset.offline || '');
        return ranges.some(function (range) {
            return dateValue >= range.start && dateValue <= range.end;
        });
    }

    function applyOfflineToDayList(dateValue) {
        var dateKey = dateValue || '';
        if (!dateKey) {
            var calendarDateInput = document.querySelector('.calendar-date');
            dateKey = calendarDateInput && calendarDateInput.value ? calendarDateInput.value : '';
        }
        var cards = document.querySelectorAll('.calendar-day-view .appointment-card');
        cards.forEach(function (card) {
            var employeeKey = card.dataset.employee || '';
            var offline = employeeKey && dateKey ? isEmployeeOfflineForDate(employeeKey, dateKey) : false;
            card.classList.toggle('appointment-card--offline', offline);
        });
    }

    function isHidden(el) {
        return !el || el.hidden === true;
    }

    function setOverlayVisible(visible) {
        if (!editOverlay) return;
        editOverlay.hidden = !visible;
        editOverlay.style.display = visible ? 'block' : 'none';
        document.body.classList.toggle('modal-open', visible);
        if (visible) {
            var settingsVisible = !!document.querySelector('.admin-section.admin-section--visible[data-section="settings"]');
            document.body.classList.toggle('overlay-in-settings', settingsVisible);
        } else {
            document.body.classList.remove('overlay-in-settings');
        }
    }

    function updateEmployeeOptionLists() {
        var cards = Array.from(settingsSection.querySelectorAll('.settings-employee-card[data-employee]'));
        var employees = cards.map(function (card) {
            var key = card.dataset.employee || '';
            var nameEl = card.querySelector('.settings-employee-name');
            var name = nameEl ? nameEl.textContent.trim() : '';
            return { key: key, name: name || key };
        }).filter(function (item) { return item.key; });

        var calendarDateInput = document.querySelector('.calendar-date');
        var calendarDate = calendarDateInput && calendarDateInput.value ? calendarDateInput.value : '';

        if (appointmentEmployeeInput) {
            var currentValue = appointmentEmployeeInput.value || '';
            appointmentEmployeeInput.innerHTML = '';

            var emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '—';
            appointmentEmployeeInput.appendChild(emptyOption);

            employees.forEach(function (item) {
                var appointmentDateInput = document.getElementById('appointment-date-input');
                var appointmentDate = appointmentDateInput && appointmentDateInput.value
                    ? appointmentDateInput.value
                    : calendarDate;
                var offline = appointmentDate ? isEmployeeOfflineForDate(item.key, appointmentDate) : false;
                var opt = document.createElement('option');
                opt.value = item.key;
                opt.textContent = item.name + (offline ? ' (offline)' : '');
                opt.disabled = !!offline;
                appointmentEmployeeInput.appendChild(opt);
            });

            appointmentEmployeeInput.value = employees.some(function (item) { return item.key === currentValue; })
                ? currentValue
                : '';
        }

        var scheduleSelect = document.getElementById('calendar-schedule-select');
        if (scheduleSelect) {
            var scheduleValue = scheduleSelect.value || 'all';
            Array.from(scheduleSelect.querySelectorAll('option')).forEach(function (opt) {
                if (opt.value !== 'all') {
                    opt.remove();
                }
            });

            employees.forEach(function (item) {
                var offline = calendarDate ? isEmployeeOfflineForDate(item.key, calendarDate) : false;
                var opt = document.createElement('option');
                opt.value = item.key;
                opt.textContent = item.name + (offline ? ' (offline)' : '');
                scheduleSelect.appendChild(opt);
            });

            scheduleSelect.value = employees.some(function (item) { return item.key === scheduleValue; })
                ? scheduleValue
                : 'all';
        }
    }

    function renderEmployeePickerServices(selected) {
        if (!employeeServicesPicker) return;
        var services = collectServiceNames();
        employeeServicesPicker.innerHTML = '';

        if (!services.length) {
            employeeServicesPicker.textContent = 'Δεν υπάρχουν υπηρεσίες.';
            return;
        }

        var selectedSet = new Set(selected && selected.length ? selected : services);
        services.forEach(function (name) {
            var label = document.createElement('label');
            label.className = 'settings-service-item';

            var input = document.createElement('input');
            input.type = 'checkbox';
            input.className = 'settings-service-checkbox';
            input.value = name;
            input.dataset.serviceName = name;
            input.checked = selectedSet.has(name);

            var text = document.createElement('span');
            text.textContent = name;

            label.appendChild(input);
            label.appendChild(text);
            employeeServicesPicker.appendChild(label);
        });
    }

    function getNextEmployeeKey() {
        var cards = settingsSection.querySelectorAll('.settings-employee-card[data-employee]');
        var maxId = 0;
        cards.forEach(function (card) {
            var match = String(card.dataset.employee || '').match(/^e(\d+)$/i);
            if (!match) return;
            var value = Number(match[1]);
            if (Number.isFinite(value)) {
                maxId = Math.max(maxId, value);
            }
        });
        return 'e' + String(maxId + 1);
    }

    function createEmployeeCard(data) {
        var list = settingsSection.querySelector('.settings-employee-list');
        if (!list) return null;

        var card = document.createElement('div');
        card.className = 'settings-employee-card';
        card.dataset.employee = data.key || getNextEmployeeKey();
        card.dataset.services = (data.services || []).join('|');

        card.innerHTML = [
            '<div class="settings-employee-header">',
            '<span class="settings-employee-name"></span>',
            '<button class="settings-employee-offline" type="button" onclick="(function(btn){var p=document.getElementById(\\'employee-offline-panel\\');if(!p)return;var card=btn.closest(\\'.settings-employee-card\\');var key=card?card.dataset.employee:\\'\\';var nameEl=card?card.querySelector(\\'.settings-employee-name\\'):null;var keyInput=document.getElementById(\\'employee-offline-key\\');if(keyInput)keyInput.value=key;var nameTarget=document.getElementById(\\'employee-offline-name\\');if(nameTarget)nameTarget.textContent=nameEl?nameEl.textContent.trim():\\'—\\';var start=document.getElementById(\\'employee-offline-start\\');if(start)start.value=\\'\\';var end=document.getElementById(\\'employee-offline-end\\');if(end)end.value=\\'\\';p.hidden=false;p.style.display=\\'block\\';var o=document.getElementById(\\'global-edit-overlay\\');if(o){o.hidden=false;o.style.display=\\'block\\';document.body.classList.add(\\'modal-open\\');}var s=document.querySelector(\\'.admin-section.admin-section--visible[data-section=\"settings\"]\\');document.body.classList.toggle(\\'overlay-in-settings\\',!!s);})(this);">Προσθήκη άδειας</button>',
            '<button class="settings-employee-delete" type="button">Διαγραφή</button>',
            '</div>',
            '<div class="settings-employee-fields">',
            '<div class="settings-employee-services">',
            '<span class="settings-employee-services-title">Μενού υπηρεσιών</span>',
            '<div class="settings-employee-services-list" data-employee-services></div>',
            '</div>',
            '</div>'
        ].join('');

        var nameEl = card.querySelector('.settings-employee-name');
        if (nameEl) {
            nameEl.textContent = data.name || '';
        }

        list.appendChild(card);
        return card;
    }

    function openEmployeeEditor() {
        if (!employeeEditPanel) {
            employeeEditPanel = document.getElementById('employee-edit-panel');
        }
        if (!employeeEditForm) {
            employeeEditForm = document.getElementById('employee-edit-form');
        }
        if (!employeeNameInput) {
            employeeNameInput = document.getElementById('employee-name-input');
        }
        if (!employeeServicesPicker) {
            employeeServicesPicker = document.getElementById('employee-services-picker');
        }
        if (!editOverlay) {
            editOverlay = document.getElementById('global-edit-overlay');
        }
        if (!employeeEditPanel) return;
        if (employeeEditForm) {
            employeeEditForm.reset();
        }
        if (employeeNameInput) {
            employeeNameInput.value = '';
        }
        renderEmployeePickerServices([]);

        employeeEditPanel.hidden = false;
        employeeEditPanel.style.display = 'block';
        setOverlayVisible(true);
    }

    function closeEmployeeEditor() {
        if (employeeEditPanel) {
            employeeEditPanel.hidden = true;
            employeeEditPanel.style.display = 'none';
        }

        if (isHidden(appointmentInspectPanel) && isHidden(customerEditPanel) &&
            isHidden(serviceEditPanel) && isHidden(overlapPanel) &&
            isHidden(customerHistoryPanel)) {
            setOverlayVisible(false);
        }
    }

    function openEmployeeOfflinePanel(source) {
        if (!employeeOfflinePanel) {
            employeeOfflinePanel = document.getElementById('employee-offline-panel');
        }
        if (!employeeOfflinePanel) return;

        var card = null;
        if (source && source.closest) {
            card = source.closest('.settings-employee-card[data-employee]');
        }

        if (card && employeeOfflineKeyInput) {
            employeeOfflineKeyInput.value = card.dataset.employee || '';
        }
        if (card && employeeOfflineName) {
            var nameEl = card.querySelector('.settings-employee-name');
            employeeOfflineName.textContent = nameEl ? nameEl.textContent.trim() : '—';
        } else if (employeeOfflineName) {
            employeeOfflineName.textContent = '—';
        }

        if (employeeOfflineStartInput) {
            employeeOfflineStartInput.value = '';
        }
        if (employeeOfflineEndInput) {
            employeeOfflineEndInput.value = '';
        }

        employeeOfflinePanel.hidden = false;
        employeeOfflinePanel.style.display = 'block';
        setOverlayVisible(true);
    }

    function closeEmployeeOfflinePanel() {
        if (employeeOfflinePanel) {
            employeeOfflinePanel.hidden = true;
            employeeOfflinePanel.style.display = 'none';
        }

        if (isHidden(appointmentInspectPanel) && isHidden(customerEditPanel) &&
            isHidden(serviceEditPanel) && isHidden(overlapPanel) &&
            isHidden(customerHistoryPanel) && isHidden(employeeEditPanel)) {
            setOverlayVisible(false);
        }
    }

    function getEmployeeServiceMap() {
        var map = {};
        var cards = settingsSection.querySelectorAll('.settings-employee-card[data-employee]');
        cards.forEach(function (card) {
            var key = card.dataset.employee;
            map[key] = parseServiceList(card.dataset.services);
        });
        return map;
    }

    function updateEmployeeSelectForService() {
        if (!appointmentEmployeeInput) return;

        var selectedService = appointmentServiceInput ? findServiceMatch(appointmentServiceInput.value) : '';
        var map = getEmployeeServiceMap();
        var options = Array.from(appointmentEmployeeInput.options);
        var appointmentDateInput = document.getElementById('appointment-date-input');
        var calendarDateInput = document.querySelector('.calendar-date');
        var dateValue = appointmentDateInput && appointmentDateInput.value
            ? appointmentDateInput.value
            : (calendarDateInput && calendarDateInput.value ? calendarDateInput.value : '');

        options.forEach(function (opt) {
            if (!opt.value) {
                opt.disabled = false;
                return;
            }
            if (!selectedService) {
                var offlineOnly = dateValue ? isEmployeeOfflineForDate(opt.value, dateValue) : false;
                opt.disabled = !!offlineOnly;
                return;
            }
            var allowed = map[opt.value] && map[opt.value].indexOf(selectedService) !== -1;
            var offline = dateValue ? isEmployeeOfflineForDate(opt.value, dateValue) : false;
            opt.disabled = !allowed || offline;
        });

        if (appointmentEmployeeInput.value) {
            var currentOption = appointmentEmployeeInput.options[appointmentEmployeeInput.selectedIndex];
            if (currentOption && currentOption.disabled) {
                appointmentEmployeeInput.value = '';
            }
        }
    }

    function renderEmployeeServiceLists() {
        serviceListCache = collectServiceNames();

        var cards = settingsSection.querySelectorAll('.settings-employee-card[data-employee]');
        cards.forEach(function (card) {
            var list = card.querySelector('[data-employee-services]');
            if (!list) return;

            list.innerHTML = '';

            if (!serviceListCache.length) {
                list.textContent = 'Δεν υπάρχουν υπηρεσίες.';
                return;
            }

            var selected = parseServiceList(card.dataset.services).filter(function (name) {
                return serviceListCache.indexOf(name) !== -1;
            });
            if (!selected.length) {
                selected = serviceListCache.slice();
            }
            card.dataset.services = selected.join('|');

            serviceListCache.forEach(function (name) {
                var label = document.createElement('label');
                label.className = 'settings-service-item';

                var input = document.createElement('input');
                input.type = 'checkbox';
                input.className = 'settings-service-checkbox';
                input.value = name;
                input.dataset.serviceName = name;
                input.checked = selected.indexOf(name) !== -1;

                var text = document.createElement('span');
                text.textContent = name;

                label.appendChild(input);
                label.appendChild(text);
                list.appendChild(label);
            });
        });
    }

    function activateSettingsTab(key) {
        var tabButtons = Array.from(settingsSection.querySelectorAll('.settings-tab[data-settings-tab]'));
        var tabPanels = Array.from(settingsSection.querySelectorAll('.settings-panel[data-settings-panel]'));

        if (!tabButtons.length || !tabPanels.length) return;

        tabButtons.forEach(function (btn) {
            var isActive = btn.dataset.settingsTab === key;
            btn.classList.toggle('settings-tab--active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            btn.tabIndex = isActive ? 0 : -1;
        });

        tabPanels.forEach(function (panel) {
            var isActive = panel.dataset.settingsPanel === key;
            panel.classList.toggle('settings-panel--active', isActive);
            panel.hidden = !isActive;
        });
    }

    function initSettingsTabs() {
        var tabButtons = Array.from(settingsSection.querySelectorAll('.settings-tab[data-settings-tab]'));
        if (!tabButtons.length) return;
        var activeBtn = tabButtons.find(function (btn) { return btn.classList.contains('settings-tab--active'); }) || tabButtons[0];
        var initialKey = activeBtn && activeBtn.dataset.settingsTab ? activeBtn.dataset.settingsTab : 'employees';
        activateSettingsTab(initialKey);
    }

    function bindSettingsListeners() {
        if (settingsListenersBound) return;
        settingsListenersBound = true;

        var tabButtons = Array.from(settingsSection.querySelectorAll('.settings-tab[data-settings-tab]'));
        tabButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                activateSettingsTab(btn.dataset.settingsTab);
            });
        });

        settingsSection.addEventListener('change', function (e) {
            var target = e.target;
            var checkbox = target && target.closest ? target.closest('.settings-service-checkbox') : null;
            if (!checkbox) return;
            var card = checkbox.closest('.settings-employee-card[data-employee]');
            if (!card) return;

            var checked = Array.from(card.querySelectorAll('.settings-service-checkbox:checked')).map(function (cb) {
                return cb.dataset.serviceName || cb.value || '';
            }).filter(Boolean);

            card.dataset.services = checked.join('|');
            updateEmployeeSelectForService();
        });

        settingsSection.addEventListener('click', function (e) {
            var deleteBtn = e.target && e.target.closest ? e.target.closest('.settings-employee-delete') : null;
            if (!deleteBtn) return;
            var card = deleteBtn.closest('.settings-employee-card[data-employee]');
            if (!card) return;
            if (!confirm('Να διαγραφεί ο εργαζόμενος;')) return;
            card.remove();
            updateEmployeeOptionLists();
            updateEmployeeSelectForService();
        });

        settingsSection.addEventListener('click', function (e) {
            var offlineBtn = e.target && e.target.closest ? e.target.closest('.settings-employee-offline') : null;
            if (!offlineBtn) return;
            openEmployeeOfflinePanel(offlineBtn);
        });

        if (appointmentServiceInput) {
            appointmentServiceInput.addEventListener('input', updateEmployeeSelectForService);
            appointmentServiceInput.addEventListener('change', updateEmployeeSelectForService);
        }

        var appointmentDateInput = document.getElementById('appointment-date-input');
        if (appointmentDateInput) {
            appointmentDateInput.addEventListener('change', updateEmployeeSelectForService);
        }

        if (btnAddEmployee) {
            btnAddEmployee.addEventListener('click', function () {
                openEmployeeEditor();
            });
        }

        settingsSection.addEventListener('click', function (e) {
            var addBtn = e.target && e.target.closest ? e.target.closest('#btn-add-employee') : null;
            if (!addBtn) return;
            openEmployeeEditor();
        });

        if (employeeCancelEdit) {
            employeeCancelEdit.addEventListener('click', function () {
                closeEmployeeEditor();
            });
        }

        if (employeeEditForm) {
            employeeEditForm.addEventListener('submit', function (e) {
                e.preventDefault();
                var name = employeeNameInput ? employeeNameInput.value.trim() : '';
                if (!name) return;

                var services = [];
                if (employeeServicesPicker) {
                    services = Array.from(employeeServicesPicker.querySelectorAll('.settings-service-checkbox:checked'))
                        .map(function (cb) { return cb.dataset.serviceName || cb.value || ''; })
                        .filter(Boolean);
                }
                if (!services.length) {
                    services = collectServiceNames();
                }

                createEmployeeCard({
                    name: name,
                    services: services
                });

                renderEmployeeServiceLists();
                updateEmployeeOptionLists();
                updateEmployeeSelectForService();
                applyOfflineToDayList();
                closeEmployeeEditor();
            });
        }

        if (employeeOfflineCancel) {
            employeeOfflineCancel.addEventListener('click', function () {
                closeEmployeeOfflinePanel();
            });
        }

        if (employeeOfflineForm) {
            employeeOfflineForm.addEventListener('submit', function (e) {
                e.preventDefault();
                var key = employeeOfflineKeyInput ? employeeOfflineKeyInput.value : '';
                var start = employeeOfflineStartInput ? employeeOfflineStartInput.value : '';
                var end = employeeOfflineEndInput ? employeeOfflineEndInput.value : '';
                if (!key || !start) return;
                var card = getEmployeeCardByKey(key);
                if (!card) return;
                addOfflineRangeToCard(card, start, end);
                updateEmployeeOptionLists();
                updateEmployeeSelectForService();
                applyOfflineToDayList(start);
                closeEmployeeOfflinePanel();
            });
        }

        if (editOverlay) {
            editOverlay.addEventListener('click', function () {
                closeEmployeeEditor();
                closeEmployeeOfflinePanel();
            });
        }

        if (servicesTable && typeof MutationObserver !== 'undefined') {
            var servicesObserver = new MutationObserver(function () {
                renderEmployeeServiceLists();
                updateEmployeeOptionLists();
                updateEmployeeSelectForService();
            });
            servicesObserver.observe(servicesTable, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
    }

    function initSettingsUI() {
        renderEmployeeServiceLists();
        updateEmployeeOptionLists();
        updateEmployeeSelectForService();
        initSettingsTabs();
        bindSettingsListeners();
        applyOfflineToDayList();
    }

    initSettingsUI();

    if (typeof window !== 'undefined') {
        window.updateEmployeeSelectForService = updateEmployeeSelectForService;
        window.initSettingsUI = initSettingsUI;
        window.openEmployeeEditor = openEmployeeEditor;
        window.closeEmployeeEditor = closeEmployeeEditor;
        window.openEmployeeOfflinePanel = openEmployeeOfflinePanel;
        window.closeEmployeeOfflinePanel = closeEmployeeOfflinePanel;
        window.isEmployeeOfflineForDate = isEmployeeOfflineForDate;
        window.applyOfflineToDayList = applyOfflineToDayList;
        window.updateEmployeeOptionLists = updateEmployeeOptionLists;
    }
});

// === SETTINGS: fallback employee modal open/close ===========================
(function () {
    function getPanel() {
        return document.getElementById('employee-edit-panel');
    }

    function isPanelVisible(panel) {
        return panel && panel.hidden !== true && panel.style.display !== 'none';
    }

    function setOverlayVisible(visible) {
        var overlay = document.getElementById('global-edit-overlay');
        if (!overlay) return;
        overlay.hidden = !visible;
        overlay.style.display = visible ? 'block' : 'none';
        document.body.classList.toggle('modal-open', visible);
        if (visible) {
            var settingsVisible = !!document.querySelector('.admin-section.admin-section--visible[data-section="settings"]');
            document.body.classList.toggle('overlay-in-settings', settingsVisible);
        } else {
            document.body.classList.remove('overlay-in-settings');
        }
    }

    function openEmployeePanelFallback() {
        var panel = getPanel();
        if (!panel) return;
        panel.hidden = false;
        panel.style.display = 'block';
        setOverlayVisible(true);
    }

    function closeEmployeePanelFallback() {
        var panel = getPanel();
        if (panel) {
            panel.hidden = true;
            panel.style.display = 'none';
        }

        var othersOpen = Array.from(document.querySelectorAll('.edit-panel')).some(function (el) {
            return el.id !== 'employee-edit-panel' && isPanelVisible(el);
        });
        if (!othersOpen) {
            setOverlayVisible(false);
        }
    }

    if (typeof window !== 'undefined') {
        if (!window.openEmployeeEditor) {
            window.openEmployeeEditor = openEmployeePanelFallback;
        }
        if (!window.closeEmployeeEditor) {
            window.closeEmployeeEditor = closeEmployeePanelFallback;
        }
    }

    document.addEventListener('click', function (e) {
        var addBtn = e.target && e.target.closest ? e.target.closest('#btn-add-employee') : null;
        if (addBtn) {
            openEmployeePanelFallback();
            return;
        }

        var cancelBtn = e.target && e.target.closest ? e.target.closest('#employee-cancel-edit') : null;
        if (cancelBtn) {
            closeEmployeePanelFallback();
        }
    });

    var overlay = document.getElementById('global-edit-overlay');
    if (overlay) {
        overlay.addEventListener('click', function () {
            closeEmployeePanelFallback();
        });
    }
})();

// === SETTINGS: working hours with breaks & account actions ===================
document.addEventListener('DOMContentLoaded', function () {
    var dayConfig = [
        { key: 'monday', label: 'Δευτέρα' },
        { key: 'tuesday', label: 'Τρίτη' },
        { key: 'wednesday', label: 'Τετάρτη' },
        { key: 'thursday', label: 'Πέμπτη' },
        { key: 'friday', label: 'Παρασκευή' },
        { key: 'saturday', label: 'Σάββατο' }
    ];

    var previewEl = document.getElementById('working-hours-preview');
    var settingsSection = document.querySelector('.admin-section[data-section="settings"]');

    if (!settingsSection) {
        return;
    }

    function getDayRow(dayKey) {
        return settingsSection.querySelector('.settings-day-row[data-day="' + dayKey + '"]');
    }

    function updateTimeInputsState(dayKey) {
        var row = getDayRow(dayKey);
        if (!row) return;

        var toggle = row.querySelector('.settings-day-open-toggle[data-day="' + dayKey + '"]');
        var isOpen = !!(toggle && toggle.checked);
        var inputs = row.querySelectorAll('.settings-time-input');
        var addBtn = row.querySelector('.settings-add-interval');

        inputs.forEach(function (input) {
            input.disabled = !isOpen;
            input.classList.toggle('settings-time-input--disabled', !isOpen);
        });

        if (addBtn) {
            addBtn.disabled = !isOpen;
        }
    }

    function updateAllTimeInputsState() {
        dayConfig.forEach(function (entry) {
            updateTimeInputsState(entry.key);
        });
    }

    function buildPreview() {
        if (!previewEl) {
            return;
        }
        var parts = [];

        dayConfig.forEach(function (entry) {
            var key = entry.key;
            var row = getDayRow(key);
            if (!row) {
                return;
            }

            var toggle = row.querySelector('.settings-day-open-toggle[data-day="' + key + '"]');
            var isOpen = !!(toggle && toggle.checked);

            if (!isOpen) {
                parts.push(entry.label + ' · Κλειστό');
                return;
            }

            var intervals = [];
            row.querySelectorAll('.settings-interval').forEach(function (intervalEl) {
                var fromInput = intervalEl.querySelector('.settings-time-input[data-field="from"]');
                var toInput = intervalEl.querySelector('.settings-time-input[data-field="to"]');
                var fromVal = fromInput && fromInput.value ? fromInput.value : '';
                var toVal = toInput && toInput.value ? toInput.value : '';

                if (fromVal || toVal) {
                    intervals.push((fromVal || '—') + '–' + (toVal || '—'));
                }
            });

            if (intervals.length === 0) {
                parts.push(entry.label + ' · Κλειστό');
            } else {
                parts.push(entry.label + ' · ' + intervals.join(', '));
            }
        });

        previewEl.textContent = parts.join(' • ');
    }

    function wireIntervalInputs(intervalEl) {
        var inputs = intervalEl.querySelectorAll('.settings-time-input');
        inputs.forEach(function (input) {
            input.addEventListener('input', buildPreview);
        });
    }

    function createExtraInterval(dayKey) {
        var intervalEl = document.createElement('div');
        intervalEl.className = 'settings-interval';
        intervalEl.innerHTML =
            '<input type="time" class="control-input settings-time-input" data-day="' + dayKey + '" data-field="from">' +
            '<span class="settings-time-separator">–</span>' +
            '<input type="time" class="control-input settings-time-input" data-day="' + dayKey + '" data-field="to">' +
            '<button type="button" class="settings-remove-interval" aria-label="Αφαίρεση διαστήματος">&times;</button>';

        wireIntervalInputs(intervalEl);

        var removeBtn = intervalEl.querySelector('.settings-remove-interval');
        removeBtn.addEventListener('click', function () {
            var row = getDayRow(dayKey);
            var intervalsWrapper = row ? row.querySelector('.settings-intervals') : null;
            intervalEl.remove();
            buildPreview();

            if (intervalsWrapper && !intervalsWrapper.querySelector('.settings-interval')) {
                var fallback = createExtraInterval(dayKey);
                var fbRemove = fallback.querySelector('.settings-remove-interval');
                if (fbRemove) {
                    fbRemove.remove();
                }
                intervalsWrapper.appendChild(fallback);
                updateTimeInputsState(dayKey);
            }
        });

        return intervalEl;
    }

    dayConfig.forEach(function (entry) {
        var key = entry.key;
        var row = getDayRow(key);
        if (!row) return;

        var toggle = row.querySelector('.settings-day-open-toggle[data-day="' + key + '"]');
        var addBtn = row.querySelector('.settings-add-interval[data-day="' + key + '"]');
        var baseIntervals = row.querySelectorAll('.settings-interval');

        baseIntervals.forEach(function (intervalEl) {
            wireIntervalInputs(intervalEl);
        });

        if (toggle) {
            toggle.addEventListener('change', function () {
                updateTimeInputsState(key);
                buildPreview();
            });
        }

        if (addBtn) {
            addBtn.addEventListener('click', function () {
                var wrapper = row.querySelector('.settings-intervals');
                if (!wrapper) return;
                var newInterval = createExtraInterval(key);
                wrapper.appendChild(newInterval);
                updateTimeInputsState(key);
                buildPreview();
            });
        }
    });

    updateAllTimeInputsState();
    buildPreview();

    var btnChangePassword = document.getElementById('btn-change-password');
    var btnLogout = document.getElementById('btn-logout');
    var settingsMessage = document.getElementById('settings-message');

    function setMessage(text) {
        if (!settingsMessage) return;
        settingsMessage.textContent = text;
    }

    if (btnChangePassword) {
        btnChangePassword.addEventListener('click', function () {
            setMessage('Η αλλαγή κωδικού θα συνδεθεί με το backend. Προς το παρόν είναι μόνο οπτική ρύθμιση.');
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', function () {
            setMessage('Η αποσύνδεση θα υλοποιηθεί όταν προστεθεί το σύστημα χρηστών.');
        });
    }
});
