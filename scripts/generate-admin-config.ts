import fs from 'fs'
import path from 'path'
import { languages } from '../config/languages'

const config = `local_backend: true

backend:
  name: git-gateway

media_folder: public/images
public_folder: /images

locale: ru

collections:
  - name: pages
    label: "📄 Страницы инструментов"
    label_singular: "Страница"
    folder: content/pages
    extension: yml
    format: yaml
    create: true
    slug: "{{fields.slug}}"
    identifier_field: slug
    summary: "{{slug}} — {{meta.title}}"

    fields:
      - name: slug
        label: "🔗 URL страницы (slug)"
        widget: string
        required: true
        pattern: ['^[a-z0-9-]+$', "Только маленькие буквы, цифры и дефис"]
        hint: "Пример: youtube-downloader, tiktok-video"

      - name: platform
        label: "📱 Платформа"
        widget: select
        required: true
        options:
          - { label: "YouTube", value: "youtube" }
          - { label: "Instagram", value: "instagram" }
          - { label: "TikTok", value: "tiktok" }
          - { label: "Facebook", value: "facebook" }
          - { label: "Twitter", value: "twitter" }

      - name: source_lang
        label: "🌍 Язык оригинала"
        widget: select
        required: true
        default: "en"
        hint: "На каком языке заполняете контент. Переводы создаются автоматически."
        options:
${languages.map(l => `          - { label: "${l.flag} ${l.name}", value: "${l.code}" }`).join('\n')}

      - name: meta
        label: "🔍 SEO мета-теги"
        widget: object
        required: true
        fields:
          - name: title
            label: "Заголовок страницы (Title)"
            widget: string
            required: true
            hint: "50-60 символов"

          - name: description
            label: "Описание (Description)"
            widget: text
            required: true
            hint: "150-160 символов"

          - name: keywords
            label: "Ключевые слова"
            widget: string
            required: false
            hint: "Через запятую"

          - name: ogImage
            label: "🖼️ OG Image"
            widget: image
            required: false
            hint: "Рекомендуемый размер: 1200x630px"

          - name: ogImageAlt
            label: "Alt текст для OG Image"
            widget: string
            required: false

      - name: pageContent
        label: "📝 Контент страницы"
        widget: object
        required: true
        fields:
          - name: h1
            label: "Заголовок H1"
            widget: string
            required: true

          - name: subtitle
            label: "Подзаголовок"
            widget: string
            required: true

          - name: intro
            label: "Вступительный текст"
            widget: text
            required: true

          - name: how_to
            label: "📋 Блок «Как скачать»"
            widget: object
            collapsed: false
            required: true
            fields:
              - name: title
                label: "Заголовок секции"
                widget: string
                required: true
                default: "How to download"

              - name: steps
                label: "Шаги"
                widget: list
                required: true
                min: 1
                fields:
                  - { name: title, label: "Название шага", widget: string, required: true }
                  - { name: description, label: "Описание", widget: text, required: true }
                  - { name: image, label: "🖼️ Картинка", widget: image, required: false }
                  - { name: imageAlt, label: "Alt текст картинки", widget: string, required: false, hint: "Описание изображения" }

          - name: features
            label: "✨ Блок «Преимущества»"
            widget: object
            collapsed: false
            required: true
            fields:
              - name: title
                label: "Заголовок секции"
                widget: string
                required: true
                default: "Why choose us"

              - name: items
                label: "Преимущества"
                widget: list
                required: true
                min: 1
                fields:
                  - { name: icon, label: "Иконка (emoji)", widget: string, required: true }
                  - { name: image, label: "🖼️ Картинка", widget: image, required: false, hint: "Вместо emoji" }
                  - { name: imageAlt, label: "Alt текст картинки", widget: string, required: false }
                  - { name: title, label: "Заголовок", widget: string, required: true }
                  - { name: description, label: "Описание", widget: text, required: true }

          - name: faq
            label: "❓ Блок «Вопросы и ответы»"
            widget: list
            required: false
            collapsed: false
            fields:
              - { name: question, label: "Вопрос", widget: string, required: true }
              - { name: answer, label: "Ответ", widget: text, required: true }
`

const outputPath = path.resolve('public/admin/config.yml')
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, config)

console.log('✅ Generated:', outputPath)
console.log('   Languages:', languages.map(l => l.code).join(', '))