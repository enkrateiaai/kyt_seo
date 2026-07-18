import { defineField, defineType } from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Website-Einstellungen',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Website-Titel',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: 'Beschreibung',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'telegramUrl',
      title: 'Telegram-Link',
      type: 'url',
    }),
  ],
  preview: {
    select: { title: 'title' },
  },
})
