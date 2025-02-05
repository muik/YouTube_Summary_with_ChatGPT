import puppeteer from "puppeteer";

const EXTENSION_PATH = "./dist";

describe("Question dialog Test", () => {
    let browser;

    beforeEach(async () => {
        browser = await puppeteer.launch({
            devtools: true,
            args: [
                `--disable-extensions-except=${EXTENSION_PATH}`,
                `--load-extension=${EXTENSION_PATH}`,
            ],
        });
    });

    afterEach(async () => {
        if (browser) {
            await browser.close();
            browser = null;
        }
    });

    // Helper function to wait for a selector and click it.
    async function waitAndClick(page, selector, options = {}) {
        await page.waitForSelector(selector, { timeout: 2000, ...options });
        await page.click(selector);
    }

    // Helper function to retrieve text content from a sub-element.
    async function getElementText(page, scopeSelector, childSelector) {
        return page.evaluate(
            (scopeSelector, childSelector) => {
                const container = document.querySelector(scopeSelector);
                return container
                    ? container.querySelector(childSelector)?.textContent
                    : "";
            },
            scopeSelector,
            childSelector
        );
    }

    // Helper function to retrieve an attribute from a sub-element.
    async function getElementAttr(
        page,
        scopeSelector,
        childSelector,
        attr = "src"
    ) {
        return page.evaluate(
            (scopeSelector, childSelector, attr) => {
                const container = document.querySelector(scopeSelector);
                return container
                    ? container.querySelector(childSelector)?.getAttribute(attr)
                    : null;
            },
            scopeSelector,
            childSelector,
            attr
        );
    }

    const runCommonTestFlow = async (page, moreOptionButtonSelector) => {
        // Common interaction flow
        await waitAndClick(page, moreOptionButtonSelector);

        const extraOptionsSelector =
            "tp-yt-iron-dropdown.ytd-popup-container:not([aria-hidden='true']) #extra-options";
        await page.waitForSelector(extraOptionsSelector, { timeout: 2000 });

        const questionButtonSelector = ".option-item[target-value=question]";
        await waitAndClick(page, questionButtonSelector);

        const questionDialogSelector = "ytd-popup-container #dialog-container";
        await page.waitForSelector(questionDialogSelector, { timeout: 2000 });

        // Wait for spinner and contents
        const spinnerSelector = `${questionDialogSelector} #spinner`;
        await page.waitForSelector(`${spinnerSelector}:not([hidden])`, {
            timeout: 2000,
        });
        await page.waitForSelector(`${spinnerSelector}[hidden]`, {
            timeout: 3000,
        });

        const contentsSelector = `${questionDialogSelector} #contents`;
        await page.waitForSelector(contentsSelector, { timeout: 2000 });

        // Validate dialog contents
        const dialogTitle = await getElementText(
            page,
            questionDialogSelector,
            "#contents .title"
        );
        expect(dialogTitle).not.toBe("");
        expect(dialogTitle.length).toBeGreaterThan(0);

        const thumbnailUrl = await getElementAttr(
            page,
            questionDialogSelector,
            "#contents img.thumbnail"
        );
        expect(thumbnailUrl).toMatch(/^https:\/\/i\.ytimg\.com\/vi\//);

        // Cleanup
        await waitAndClick(page, `${questionDialogSelector} #close-button`);
        await page.waitForSelector(questionDialogSelector, {
            timeout: 2000,
            hidden: true,
        });
    };

    it(`Question dialog renders correctly`, async () => {
        const page = await browser.newPage();
        await page.setViewport({ width: 1024, height: 768 });
        await page.goto("https://www.youtube.com/watch?v=_CcYSnoZytk", {
            waitUntil: ["networkidle0", "domcontentloaded"],
        });

        const title = await page.title();
        expect(title).toContain("YouTube");

        for (const selector of [
            // main video
            "#actions-inner #button-shape>button div.yt-spec-touch-feedback-shape__fill",
            // video list
            "ytd-compact-video-renderer yt-icon-button button#button",
        ]) {
            await runCommonTestFlow(page, selector);
        }
    });
});
