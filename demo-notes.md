# Notebook UX Reviewer Demo Notes


## Goals
- To help us as notebook authors provide more consistent, helpful guidance for end users.
- When we develop complex notebooks for handoff it can be hard to ensure the intent and logic of the author are easy for others to follow.
- The ususal UX goals + the standards set out by Justin's review template to make the experience of using a notebook more intuitive and less error-prone.

## Design Path - Prototypes

- **GitHub Action** - Created a basic GH action that reviewed PRs based on static analysis rules derived from Justin's review framework. Wasn't ideal for prototyping because it wasn't flexible enough to help me think through all the stages involved with a review, and was hard to test especially iterating on a prompt.
- **Cursor Rule** - Created a basic Cursor rule that could invoke a review from the chat window. Very primitive in terms of execution, and too Cursor-centric. 
- **Jupyter Notebook** - Justin already had this in progress
- **Web UI** - Easy to iterate. Best for thinking through various stages of notebook review both user-based and automated. Enabled me to try PatternFly. Easy to test and demo. Accessible by CCS team for review and input.
- **Python Library** - Haven't attempted this yet



## Demo

- Review a notebook
- Compare OG notebook review with updated

## Takeaways

- HITL is important for refining criteria and prompts to get the best reviews.

- Static analysis doesn't quite cut it for all checks in the review framework. Could use an LLM eval stage for nuanced review, if we have the right model.

- Available on GH if you want to run it yourself. ReadMe is outdated, will update shortly.