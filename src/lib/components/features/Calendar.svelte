<script>
    import { createEventDispatcher } from "svelte";
    import { ChevronLeft, ChevronRight } from "lucide-svelte";
    import { fly } from "svelte/transition";

    export let value = null; // Date | null
    export let minDate = null; // Date | null
    export let maxDate = null; // Date | null

    const dispatch = createEventDispatcher();

    // Current viewing month/year
    let viewDate = value ? new Date(value) : new Date();
    $: currentMonth = viewDate.getMonth();
    $: currentYear = viewDate.getFullYear();

    const DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
    const MONTHS = [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
    ];

    // Calculate calendar grid
    $: calendarDays = (() => {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const startPadding = firstDay.getDay();
        const totalDays = lastDay.getDate();

        const days = [];

        // Previous month padding
        const prevMonthLast = new Date(currentYear, currentMonth, 0).getDate();
        for (let i = startPadding - 1; i >= 0; i--) {
            days.push({
                date: new Date(
                    currentYear,
                    currentMonth - 1,
                    prevMonthLast - i,
                ),
                isCurrentMonth: false,
                isToday: false,
                isSelected: false,
            });
        }

        // Current month days
        const today = new Date();
        for (let d = 1; d <= totalDays; d++) {
            const date = new Date(currentYear, currentMonth, d);
            const isToday =
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();
            const isSelected =
                value &&
                date.getDate() === value.getDate() &&
                date.getMonth() === value.getMonth() &&
                date.getFullYear() === value.getFullYear();

            days.push({
                date,
                isCurrentMonth: true,
                isToday,
                isSelected,
            });
        }

        // Next month padding (fill to 42 = 6 weeks)
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({
                date: new Date(currentYear, currentMonth + 1, i),
                isCurrentMonth: false,
                isToday: false,
                isSelected: false,
            });
        }

        return days;
    })();

    function prevMonth() {
        viewDate = new Date(currentYear, currentMonth - 1, 1);
    }

    function nextMonth() {
        viewDate = new Date(currentYear, currentMonth + 1, 1);
    }

    function selectDate(day) {
        if (!day.isCurrentMonth) {
            viewDate = new Date(day.date);
        }
        value = day.date;
        dispatch("select", day.date);
    }

    function isDisabled(date) {
        if (minDate && date < minDate) return true;
        if (maxDate && date > maxDate) return true;
        return false;
    }
</script>

<div class="calendar" transition:fly={{ y: -10, duration: 150 }}>
    <!-- Header -->
    <div class="calendar-header">
        <button class="nav-btn" on:click={prevMonth} aria-label="Mês anterior">
            <ChevronLeft size={14} />
        </button>
        <div class="month-year-selects">
            <select
                class="month-select"
                value={currentMonth}
                on:change={(e) =>
                    (viewDate = new Date(
                        currentYear,
                        parseInt(e.target.value),
                        1,
                    ))}
            >
                {#each MONTHS as month, i}
                    <option value={i}>{month}</option>
                {/each}
            </select>
            <select
                class="year-select"
                value={currentYear}
                on:change={(e) =>
                    (viewDate = new Date(
                        parseInt(e.target.value),
                        currentMonth,
                        1,
                    ))}
            >
                {#each Array.from({ length: 10 }, (_, i) => currentYear - 5 + i) as year}
                    <option value={year}>{year}</option>
                {/each}
            </select>
        </div>
        <button class="nav-btn" on:click={nextMonth} aria-label="Próximo mês">
            <ChevronRight size={14} />
        </button>
    </div>

    <!-- Day names -->
    <div class="calendar-weekdays">
        {#each DAYS as day}
            <div class="weekday">{day}</div>
        {/each}
    </div>

    <!-- Calendar grid -->
    <div class="calendar-grid">
        {#each calendarDays as day}
            <button
                class="calendar-day"
                class:other-month={!day.isCurrentMonth}
                class:today={day.isToday}
                class:selected={day.isSelected}
                class:disabled={isDisabled(day.date)}
                disabled={isDisabled(day.date)}
                on:click={() => selectDate(day)}
            >
                {day.date.getDate()}
            </button>
        {/each}
    </div>

    <!-- Today shortcut -->
    <div class="calendar-footer">
        <button
            class="today-btn"
            on:click={() => {
                const today = new Date();
                viewDate = today;
                value = today;
                dispatch("select", today);
            }}
        >
            Hoje
        </button>
    </div>
</div>

<style>
    .calendar {
        background: linear-gradient(
            180deg,
            rgba(24, 20, 32, 0.98),
            rgba(16, 14, 22, 0.98)
        );
        border: 1px solid rgba(139, 92, 246, 0.25);
        border-radius: 12px;
        padding: 10px;
        width: 220px;
        backdrop-filter: blur(20px);
        box-shadow:
            0 10px 25px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(139, 92, 246, 0.1) inset;
    }

    .calendar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
    }

    .nav-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #999;
        cursor: pointer;
        transition: all 0.2s;
    }

    .nav-btn:hover {
        background: rgba(139, 92, 246, 0.15);
        border-color: rgba(139, 92, 246, 0.3);
        color: #c4b5fd;
    }

    .month-year-selects {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .month-select,
    .year-select {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        color: #ede9fe;
        font-size: 10px;
        font-weight: 600;
        padding: 3px 4px;
        cursor: pointer;
        outline: none;
        transition: all 0.2s;
    }

    .month-select:hover,
    .year-select:hover {
        border-color: rgba(139, 92, 246, 0.4);
        background: rgba(139, 92, 246, 0.1);
    }

    .month-select:focus,
    .year-select:focus {
        border-color: rgba(139, 92, 246, 0.5);
        box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.15);
    }

    .month-select option,
    .year-select option {
        background: #1a1625;
        color: #ede9fe;
    }

    .year-select {
        width: 55px;
    }

    .calendar-weekdays {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 1px;
        margin-bottom: 4px;
    }

    .weekday {
        text-align: center;
        font-size: 9px;
        font-weight: 600;
        text-transform: uppercase;
        color: #666;
        padding: 2px;
    }

    .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 1px;
    }

    .calendar-day {
        width: 26px;
        height: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 500;
        color: #e2e8f0;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;
    }

    .calendar-day:hover:not(.disabled):not(.selected) {
        background: rgba(139, 92, 246, 0.1);
        border-color: rgba(139, 92, 246, 0.2);
    }

    .calendar-day.other-month {
        color: #444;
    }

    .calendar-day.today {
        color: #a78bfa;
        font-weight: 700;
        position: relative;
    }

    .calendar-day.today::after {
        content: "";
        position: absolute;
        bottom: 2px;
        left: 50%;
        transform: translateX(-50%);
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background: linear-gradient(135deg, #a78bfa, #7c3aed);
    }

    .calendar-day.selected {
        background: linear-gradient(135deg, #7c3aed, #6d28d9);
        border-color: rgba(139, 92, 246, 0.5);
        color: #fff;
        font-weight: 600;
        box-shadow: 0 0 20px rgba(124, 58, 237, 0.4);
    }

    .calendar-day.disabled {
        color: #333;
        cursor: not-allowed;
        opacity: 0.4;
    }

    .calendar-footer {
        display: flex;
        justify-content: center;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .today-btn {
        background: transparent;
        border: 1px solid rgba(139, 92, 246, 0.3);
        color: #a78bfa;
        font-size: 10px;
        font-weight: 600;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .today-btn:hover {
        background: rgba(139, 92, 246, 0.1);
        border-color: rgba(139, 92, 246, 0.5);
        color: #c4b5fd;
    }
</style>
