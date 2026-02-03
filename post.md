# Markdwon2Paper - My 3‑Hour Sprint with Opencode, MiniMax-M2.1 to Ship an Obsidian plugin

I am currently in a class that requires to submit papers in fully academic APA-style PDF. After using Obsidian for all my notes and assignments for the last 3 years, going back to Word sounded like the worse that could ever happen to me. So with a bit of time in my hands and influenced by the Opencode hype, I dived in.
Below is a behind‑the‑scenes look at how I combined prompting, TypeScript expertise, and a “make things work” mindset to deliver a usable product in record time.
---
1. The Problem Space
Students and researchers constantly wrestle with two conflicting tasks:
1. Write in Markdown – the lightweight, distraction‑free format we all love in Obsidian.  
2. Submit a PDF – formatted to strict APA (or MLA) guidelines, complete with citations and references.
Manually copying text into a word processor, tweaking headings, re-doing all the citations and adjusting line spacing is a pain point I’m over with. My goal was simple: press a button, get a PDF that looks like a school‑ready paper.
---
I first looked at the friendly manual, the Obsidian docs are great and have a great in depth page for plugins. I did as advised and created a separate vault for my dev work, pasted some samples and I was off to try new things. Git clone the demo and here I am. 
I did a quick `nix run nixpkgs#opencode`, set up my providers. That same day Anthropic blocked subscriptions from being used outside Claude Code. Since Anthropic models were out of the question based on really high API pricing and no subscriptions for Opencode I wanted to try the best next thing, some say GPT-5.2, GLM-4.7, Kimi or MiniMax-M2.1 I looked at the rates for each in OpenRouter and choose MiniMax-M2 to make my tokens last as long as possible. 

2. Starting with a Prompt
I wanted to see what all the hype was about, so I ditched any architecture scaffolding and jumped straight into prompting. First using the Plan mode.
> “Create a plan for an Obsidian plugin that reads the active markdown file, parses headings, paragraphs, and citations, then exports a PDF with APA formatting, 1 inch margins, 1.5 spacing and 12pt Times New Roman Keep the code modular.”
What followed was a rapid, iterative dialogue:

The model asked me what tools should I use from a list of possible options. jspdf for creating the PDFs, what to do with photos, tables, code blocks; it asked what to expect from the citations, how to handle them and store them.

After a bit, it tells me the plan is done, I skim through it and sounds reasonable, same structure as the demo plugin form Obsidian's docs with a couple new files that will scan the markdown text and parse it into TypeScript objects jspdf can understand, a basic formatter that sets the text on the PDF and an APA formatter that adds the margins, spacing, font and sizing. 

I let it implement in build mode, let the model do it's thing and by the time it dinged telling me it was ready, I happily opened Obsidian, go and test and ... nothing 

MiniMax-M2.1 forgot to assign a function to the button, cool, back to prompting.
> "Can you ensure that the button inside the ribbon is calling the plugin? @src/ui/ribbon-manager.ts"

After a `You are absolutly correct` it edited the file to call the right function and even added a notification.

Great! Now it will generate a PDF. Well, it did but the text is one line on top of each other and the margins are at least 4 inches on all sides. Back to prompting, let's see.

> "I tested the plugin but it returns a PDF with really big margins and jumbled text in only 1 line. Can you check what are we doing for wrapping the text? Also add a configuration screen where the user can tweak the margins and select the format, we will only implement APA for now."

A bunch of edits pass by and it dings again, telling me everything was fixed and the request was successful. It did add the settings page as asked and I can now change the margins, in hope that I can find what is the model doing to get such big margins and why are they not 1 inch. The formatting selector is there, great! 
I test the plugin and it wraps around the big margins, okay, let's tweak the numbers on the settings screen and see what happens. I changed them from 1 to 0.1 expecting basically no margins. Export PDF, big margins again.

One last prompt before I go in and do it myself; This time in Plan mode:
> "The margins are still really big, can you tell me how the margins are being calculated?"

It returned the type definition of `margins`, I guess I can see why but come on!

I went in with my regular editor and quickly found out that the margin values passed from the settings page were multiplied by 12 before being passed on and then again when being applied when creating the frame in jspdf. I changed that and we are back to prompting.

After fixing the margins, I noticed that there was no wrapping into a next page, the document was only one page, no matter how long, it will bleed out through the bottom.

Let's see if MiniMax-M2.1 can help.

> "The new document generated has proper margins after my edit but the document bleeds out on the first page and does not wrap into the second page, can you take a look and make sure content goes across pages and does not stay in one page?"

And this time it did, it totally fixed the issue right away and now I had a good looking PDF that wraps around as expected with the set margins. 

With a more or less working prototype, I went ahead and squashed all the commits the model did into the first proof-of-concept commit.

Let's add more things, 

> "Great! that works and now the PDF wraps properly. Can you help me create page break whenever you see the reference section? it should be something like ## References or ## Citations"

After burning some tokes, sure enough it did create a page break when seeing those exceptions.

Then I remember my Discrete Math notes, LaTeX rendering of equations and math language is best in class second to none. If I can make LaTeX work here, citations are already inside Obsidian, this can be by far the best paper writing solution for me!

So I prompted away; first in Plan mode:
> "Can you come up with a plan to render LaTeX into PDF with this plugin. LaTeX in markdown will always be enclosed in single $ for in-line LaTeX and double $$ for single line LaTeX. $2+2$ should be rendered in place of the text $2+2$ and $$2+2$$ should create a new line before and after."

That burned out some tokens but did not work, it generated every line on the same spot again.

---
##  The Final Product
After three hours of back‑and‑forth with the AI, the plugin now offers:

| Feature | Status |
|---------|--------|
| Export active markdown to APA‑styled PDF | ✅ |
| Font selection (Times, Helvetica, Courier) | ✅ |
| Adjustable margins, double‑spacing, first‑line indent | ✅ |
| Citation parsing ([@key]) and reference list generation | ✅ |
| Table support via jspdf-autotable | ✅ |
| Settings UI - Customize fonts and margins | ✅ |

The plugin can be built with npm run build and dropped directly into an Obsidian vault, or installed from source by developers following the README.
---
## Takeaways for me
* Prompt‑first development is here and it is not a shortcut; it’s a catalyst. It accelerates boilerplate creation, lets you focus on logic.  
* You still need to know what you are doing. The AI supplies the scaffolding; you provide the critical decisions—type safety, UX polish, and edge‑case handling.  
* Iterative feedback loops (run → observe → prompt → refine) compress the traditional development cycle dramatically.  
	* Wiring a feedback loop into the model makes them 10x better
---
## Looking Ahead for this Plugin
I’m already planning the next steps:
* Full inline and new line LaTeX support (hooking MathJax into the PDF flow).  
* Image embedding and richer table styling.  
* MLA and Chicago formatters via the existing factory pattern.  

---
TLDR; Opencode is pretty cool and other models different from Claude are still great! If you can give the model a good feedback loop, it will chase the goal indefinitely 
