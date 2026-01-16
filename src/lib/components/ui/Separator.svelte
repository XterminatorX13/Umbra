<script lang="ts">
    import { cn } from "../../cn";

    export let orientation: "horizontal" | "vertical" = "horizontal";
    export let className: string = "";
</script>

<div
    role="separator"
    class={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className,
    )}
/>
