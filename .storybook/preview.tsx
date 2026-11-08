import type { Preview } from "@storybook/nextjs";
import { withThemeByClassName } from "@storybook/addon-themes";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/ibm-plex-serif/600.css";
import "../src/app/globals.css";

const preview: Preview = {
    parameters: {
        layout: "padded",
        viewport: {
            viewports: {
                "page-wide": {
                    name: "Page wide (≥73rem)",
                    styles: { width: "1600px", height: "1000px" },
                },
            },
        },
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
    },
    decorators: [
        // Zen-toggle stories leave html.zen behind, which hides sidebars via
        // `zen:hidden`. Clear it before every render so stories don't bleed.
        (Story) => {
            document.documentElement.classList.remove("zen");
            return <Story />;
        },
        // Toggles the `dark` class on the iframe <html> — same mechanism as the
        // site's ThemeToggle, so all tokens switch via globals.css.
        withThemeByClassName({
            themes: {
                light: "light",
                dark: "dark",
            },
            defaultTheme: "light",
        }),
    ],
};

export default preview;
