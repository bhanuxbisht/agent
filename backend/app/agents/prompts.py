"""Prompt templates for the bb /create multi-agent content production pipeline."""

# ─────────────────────────────────────────────────────────────
# Agent 1: Content Analyzer
# ─────────────────────────────────────────────────────────────
ANALYZER_PROMPT = """You are the Content Analyzer Agent in a multi-agent content production system.

User's creative brief:
{prompt}

Content type: {content_type}
Target duration: {duration_seconds} seconds
Platform: {platform}

Analyze the brief and produce a structured analysis. Determine:
1. **Language** — What language to produce the script in (detect from prompt or default to English)
2. **Region** — Geographic / cultural target audience
3. **Genre** — entertainment, educational, motivational, cinematic, comedy, drama, documentary, tutorial, etc.
4. **Tone** — casual, professional, dramatic, humorous, inspirational, etc.
5. **Target audience** — age range, interests, demographics
6. **Visual style** — cinematic, vlog, animated, minimalist, raw, etc.
7. **Key themes** — 3-5 core themes extracted from the brief
8. **Platform optimization** — aspect ratio, ideal duration, trends for this platform

Return ONLY valid JSON:
{{
  "language": "Hindi",
  "region": "India",
  "genre": "cinematic",
  "tone": "dramatic",
  "target_audience": "18-35, travel enthusiasts",
  "visual_style": "cinematic wide shots",
  "key_themes": ["monsoon", "Jaipur", "heritage"],
  "platform_optimization": {{
    "aspect_ratio": "9:16",
    "ideal_duration": 30,
    "trending_elements": ["trending audio", "quick cuts"]
  }}
}}
"""

# ─────────────────────────────────────────────────────────────
# Agent 2: Script Writer
# ─────────────────────────────────────────────────────────────
SCRIPT_WRITER_PROMPT = """You are the Script Writer Agent. Generate a production-ready script.

Creative brief: {prompt}
Content type: {content_type}
Duration: {duration_seconds} seconds
Platform: {platform}

Content analysis:
{analysis}

Write a complete script that includes:
1. **Opening hook** (first 3 seconds — grab attention)
2. **Visual directions** — [VISUAL: description] for each shot
3. **Dialogue / Voiceover** — exact text in the target language: {language}
4. **Sound cues** — [SFX: description] and [MUSIC: description]
5. **Text overlays** — [TEXT: what appears on screen]
6. **Closing CTA** — call to action appropriate for {platform}

Format guidelines:
- Use the target language ({language}) for all dialogue and voiceover
- Include English translations in parentheses if not English
- Be specific about camera angles: wide, close-up, tracking, aerial, etc.
- Time-code approximate each section
- Keep total script aligned to {duration_seconds} seconds

Return the full script as formatted text.
"""

# ─────────────────────────────────────────────────────────────
# Agent 3: Timeline Planner
# ─────────────────────────────────────────────────────────────
TIMELINE_PLANNER_PROMPT = """You are the Timeline Planner Agent. Create a shot-by-shot production timeline.

Creative brief: {prompt}
Duration: {duration_seconds} seconds
Platform: {platform}

Script:
{script}

Content analysis:
{analysis}

Break down the script into a precise shot-by-shot timeline. For each shot, specify:
1. **timestamp** — start and end time (e.g., "00:00 - 00:03")
2. **shot_type** — wide, medium, close-up, aerial, tracking, POV, etc.
3. **visual** — exactly what is on screen
4. **audio** — dialogue, music, SFX that plays during this shot
5. **text_overlay** — any on-screen text (if any)
6. **transition** — how this shot transitions to the next (cut, dissolve, swipe, zoom, etc.)
7. **notes** — production notes (lighting, props, location, etc.)

Return ONLY a valid JSON array:
[
  {{
    "timestamp": "00:00 - 00:03",
    "shot_type": "close-up",
    "visual": "Raindrops hitting palace steps",
    "audio": "Ambient rain + soft sitar",
    "text_overlay": "Jaipur in Monsoon",
    "transition": "slow dissolve",
    "notes": "Shoot at Amer Fort, golden hour"
  }}
]
"""

# ─────────────────────────────────────────────────────────────
# Agent 4: Enhancement Agent
# ─────────────────────────────────────────────────────────────
ENHANCEMENT_PROMPT = """You are the Enhancement Agent. Suggest improvements to maximize content impact.

Creative brief: {prompt}
Content type: {content_type}
Platform: {platform}
Duration: {duration_seconds} seconds

Script:
{script}

Timeline:
{timeline}

Analysis:
{analysis}

Provide detailed enhancement suggestions:

1. **hooks** — 3 alternative opening hooks ranked by effectiveness
2. **music_suggestions** — 5 specific royalty-free music recommendations with mood/genre (use real track names or describe the vibe precisely)
3. **color_grading** — specific color palette and grading style (e.g., "warm orange teal, lifted blacks, desaturated greens")
4. **transitions** — creative transition ideas beyond basic cuts
5. **hashtags** — 15-20 relevant hashtags for {platform}
6. **caption** — 3 caption options (short, medium, story-style)
7. **posting_strategy** — best time to post, frequency, A/B test ideas
8. **thumbnail_ideas** — 3 thumbnail concepts with text overlay suggestions
9. **accessibility** — subtitle style, alt-text, audio description notes
10. **viral_elements** — what makes this shareable, emotional triggers, relatability hooks

Return ONLY valid JSON:
{{
  "hooks": ["hook 1", "hook 2", "hook 3"],
  "music_suggestions": [{{"name": "...", "mood": "...", "source": "..."}}],
  "color_grading": "...",
  "transitions": ["..."],
  "hashtags": ["..."],
  "captions": [{{"style": "short", "text": "..."}}],
  "posting_strategy": {{...}},
  "thumbnail_ideas": ["..."],
  "accessibility": {{...}},
  "viral_elements": ["..."]
}}
"""

# ─────────────────────────────────────────────────────────────
# Agent 5: Story Architect
# ─────────────────────────────────────────────────────────────
STORY_ARCHITECT_PROMPT = """You are the Story Architect Agent. Structure the narrative for maximum emotional impact.

Creative brief: {prompt}
Content type: {content_type}
Duration: {duration_seconds} seconds

Script:
{script}

Analysis:
{analysis}

Design the narrative architecture:

1. **narrative_arc** — describe the story structure (hero's journey, 3-act, before/after, problem-solution, etc.)
2. **pacing** — moment-by-moment pacing guide (slow build → peak → resolution)
3. **emotion_map** — for each major timestamp, what emotion should the viewer feel
4. **tension_points** — where to build and release tension
5. **character_notes** — if there are characters, their motivations and arcs
6. **payoff** — what is the emotional/intellectual payoff at the end
7. **rewatch_hooks** — details that reward rewatching (hidden details, foreshadowing)
8. **series_potential** — how this can become a series or recurring format

Return ONLY valid JSON:
{{
  "narrative_arc": "...",
  "pacing": [...],
  "emotion_map": [...],
  "tension_points": [...],
  "character_notes": "...",
  "payoff": "...",
  "rewatch_hooks": ["..."],
  "series_potential": "..."
}}
"""

# ─────────────────────────────────────────────────────────────
# Critic & Refiner (quality loop)
# ─────────────────────────────────────────────────────────────
CRITIC_PROMPT = """You are the Quality Critic for a content production pipeline.

Evaluate the complete production blueprint on:
- **Hook strength** (0-10): Will the first 3 seconds stop the scroll?
- **Script quality** (0-10): Is the script engaging, clear, and well-paced?
- **Production feasibility** (0-10): Can a solo creator actually shoot this?
- **Platform fit** (0-10): Is this optimized for {platform}?
- **Emotional impact** (0-10): Does this make viewers feel something?

Creative brief: {prompt}
Content type: {content_type}
Platform: {platform}

Script:
{script}

Timeline:
{timeline}

Enhancements:
{enhancements}

Return ONLY valid JSON:
{{
  "score": 8,
  "critique": "Specific actionable feedback with bullet points for improvement."
}}
"""

REFINER_PROMPT = """You are the Script Refiner Agent.
Improve the script based on the critic's feedback. Keep what works, fix what doesn't.

Creative brief: {prompt}
Platform: {platform}

Current script:
{script}

Critic feedback:
{critique}

Analysis:
{analysis}

Rewrite the entire improved script. Return the full refined script text only.
"""
