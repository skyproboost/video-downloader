import fs from 'node:fs'
import path from 'node:path'
import { languages } from '../config/languages'
import { platforms } from '../config/platforms'

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

      - name: footerLinkText
        label: "🦶 Текст ссылки в футере"
        widget: string
        required: false
        hint: "Если заполнено — ссылка появится в футере сайта"

      - name: platform
        label: "🎬 Платформа"
        widget: select
        required: true
        hint: "Выберите платформу для этого инструмента"
        options:
${platforms.map(p => `          - { label: "${p.name}", value: "${p.id}" }`).join('\n')}

      - name: source_lang
        label: "🌍 Язык оригинала"
        widget: select
        required: true
        default: "en"
        hint: "На каком языке заполняете контент. Переводы создаются автоматически."
        options:
          - { label: "English", value: "en" }
          - { label: "Русский", value: "ru" }

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
          - name: mainTitle
            label: "Главный заголовок"
            widget: string
            required: true

          - name: subtitle
            label: "Подзаголовок"
            widget: string
            required: false

          - name: intro
            label: "Подпись под инпутом"
            widget: text
            required: false

          - name: how_to
            label: "📋 Блок «Как скачать»"
            widget: object
            collapsed: true
            required: false
            hint: "Блоки с картинкой слева и инструкцией справа"
            fields:
              - name: title
                label: "Заголовок секции"
                widget: string
                required: false
                hint: "Например: Как скачать видео"

              - name: blocks
                label: "Блоки инструкций"
                widget: list
                required: false
                hint: "Каждый блок = картинка + заголовок + описание"
                fields:
                  - name: title
                    label: "Заголовок блока"
                    widget: string
                    required: false
                    hint: "Например: Как скачать видео с Ютуба на компьютер бесплатно?"

                  - name: content
                    label: "Описание (шаги списком)"
                    widget: text
                    required: true
                    hint: |
                      Каждый шаг с новой строки:
                      1. Первый шаг
                      2. Второй шаг
                      3. Третий шаг

                  - name: image
                    label: "🖼️ Картинка"
                    widget: image
                    required: false
                    hint: "Рекомендуемый размер: 400x300px"

                  - name: imageAlt
                    label: "Alt текст картинки"
                    widget: string
                    required: false

          - name: features
            label: "✨ Блок «Преимущества»"
            widget: object
            collapsed: true
            required: false
            hint: "Оставьте пустым, если блок не нужен"
            fields:
              - name: title
                label: "Заголовок секции"
                widget: string
                required: false

              - name: items
                label: "Преимущества"
                widget: list
                required: false
                fields:
                  - { name: icon, label: "Иконка (emoji)", widget: string, required: false }
                  - { name: title, label: "Заголовок", widget: string, required: true }
                  - { name: description, label: "Описание", widget: text, required: true }

          - name: faq
            label: "❓ Блок «Вопросы и ответы»"
            widget: list
            required: false
            collapsed: true
            fields:
              - { name: question, label: "Вопрос", widget: string, required: true }
              - { name: answer, label: "Ответ", widget: text, required: true }
`

const outputPath = path.resolve('public/admin/config.yml')
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, config)

console.log('✅ Generated:', outputPath)
console.log('   Languages:', languages.map(l => l.code).join(', '))
console.log('   Platforms:', platforms.map(p => p.id).join(', '))