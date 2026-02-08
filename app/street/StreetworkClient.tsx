'use client';

import { useState, useMemo } from 'react';
import PatrolPlanManager from '@/components/PatrolPlanManager';

type StreetworkStat = {
  id: number;
  workerName: string;
  month: string;
  interactions: number;
  newContacts: number;
  interventions: number;
  avatar?: string | null;
  bgColor?: string | null;
  createdAt: string;
  updatedAt: string;
};

const WORKERS = ['Dawid', 'Julia', 'Łukasz', 'Mateusz'];

const DEFAULT_AVATARS: Record<string, string> = {
  Dawid: 'D',
  Julia: 'J',
  Łukasz: 'Ł',
  Mateusz: 'M',
};

const DEFAULT_COLORS: Record<string, string> = {
  Dawid: 'from-blue-500 to-indigo-500',
  Julia: 'from-pink-500 to-purple-500',
  Łukasz: 'from-green-500 to-teal-500',
  Mateusz: 'from-orange-500 to-red-500',
};

const AVATAR_OPTIONS = [
  // Litery
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  // Ludzie - Praca
  '👨‍💼',
  '👩‍💼',
  '🧑‍💼',
  '👨‍🎓',
  '👩‍🎓',
  '🧑‍🎓',
  '👨‍🏫',
  '👩‍🏫',
  '🧑‍🏫',
  '👨‍⚕️',
  '👩‍⚕️',
  '🧑‍⚕️',
  '👨‍🔧',
  '👩‍🔧',
  '🧑‍🔧',
  '👨‍🚒',
  '👩‍🚒',
  '🧑‍🚒',
  '👨‍🌾',
  '👩‍🌾',
  '🧑‍🌾',
  '👨‍🍳',
  '👩‍🍳',
  '🧑‍🍳',
  '👨‍🎨',
  '👩‍🎨',
  '🧑‍🎨',
  '👨‍✈️',
  '👩‍✈️',
  '🧑‍✈️',
  '👨‍🚀',
  '👩‍🚀',
  '🧑‍🚀',
  '👨‍⚖️',
  '👩‍⚖️',
  '🧑‍⚖️',
  // Ludzie - Zwykli
  '👨',
  '👩',
  '🧑',
  '👦',
  '👧',
  '🧒',
  '👶',
  '👴',
  '👵',
  '🧓',
  // Ludzie - Sporty
  '🏃‍♂️',
  '🏃‍♀️',
  '🏃',
  '🚴‍♂️',
  '🚴‍♀️',
  '🚴',
  '🏋️‍♂️',
  '🏋️‍♀️',
  '🏋️',
  '⛹️‍♂️',
  '⛹️‍♀️',
  '⛹️',
  '🤸‍♂️',
  '🤸‍♀️',
  '🤸',
  '🧘‍♂️',
  '🧘‍♀️',
  '🧘',
  // Superbohaterowie & Fantasy
  '🦸‍♂️',
  '🦸‍♀️',
  '🦸',
  '🦹‍♂️',
  '🦹‍♀️',
  '🦹',
  '🧙‍♂️',
  '🧙‍♀️',
  '🧙',
  '🧚‍♂️',
  '🧚‍♀️',
  '🧚',
  '🧛‍♂️',
  '🧛‍♀️',
  '🧛',
  '🧜‍♂️',
  '🧜‍♀️',
  '🧜',
  '🧝‍♂️',
  '🧝‍♀️',
  '🧝',
  '🧞‍♂️',
  '🧞‍♀️',
  '🧞',
  // Zwierzęta - Ssaki
  '🐶',
  '🐱',
  '🐭',
  '🐹',
  '🐰',
  '🦊',
  '🐻',
  '🐼',
  '🐨',
  '🐯',
  '🦁',
  '🐮',
  '🐷',
  '🐸',
  '🐵',
  '🐔',
  '🐧',
  '🐦',
  '🦆',
  '🦅',
  '🦉',
  '🦇',
  '🐺',
  '🐗',
  '🐴',
  '🦄',
  '🐝',
  '🐛',
  '🦋',
  '🐌',
  '🐞',
  '🐜',
  '🦗',
  '🕷️',
  '🦂',
  // Zwierzęta - Wodne
  '🐙',
  '🦑',
  '🦐',
  '🦞',
  '🦀',
  '🐡',
  '🐠',
  '🐟',
  '🐬',
  '🐳',
  '🐋',
  '🦈',
  '🐊',
  '🐢',
  '🦎',
  '🐍',
  // Rośliny & Natura
  '🌲',
  '🌳',
  '🌴',
  '🌵',
  '🌾',
  '🌿',
  '☘️',
  '🍀',
  '🍁',
  '🍂',
  '🍃',
  '🌺',
  '🌻',
  '🌼',
  '🌷',
  '🌹',
  '🥀',
  '🌸',
  '💐',
  '🏵️',
  '🌱',
  '🪴',
  '🌾',
  '🍄',
  '🌰',
  // Jedzenie
  '🍎',
  '🍊',
  '🍋',
  '🍌',
  '🍉',
  '🍇',
  '🍓',
  '🍈',
  '🍒',
  '🍑',
  '🥭',
  '🍍',
  '🥥',
  '🥝',
  '🍅',
  '🍆',
  '🥑',
  '🥦',
  '🥬',
  '🥒',
  '🌶️',
  '🌽',
  '🥕',
  '🧄',
  '🧅',
  '🥔',
  '🍠',
  '🥐',
  '🥯',
  '🍞',
  '🥖',
  '🥨',
  '🧀',
  '🥚',
  '🍳',
  '🧈',
  '🥞',
  '🧇',
  '🥓',
  '🥩',
  '🍗',
  '🍖',
  '🦴',
  '🌭',
  '🍔',
  '🍟',
  '🍕',
  '🥪',
  '🥙',
  '🧆',
  '🌮',
  '🌯',
  '🥗',
  '🥘',
  '🍝',
  '🍜',
  '🍲',
  '🍛',
  '🍣',
  '🍱',
  '🥟',
  '🦪',
  '🍤',
  '🍙',
  '🍚',
  '🍘',
  '🍥',
  '🥠',
  '🥮',
  '🍢',
  '🍡',
  '🍧',
  '🍨',
  '🍦',
  '🥧',
  '🧁',
  '🍰',
  '🎂',
  '🍮',
  '🍭',
  '🍬',
  '🍫',
  '🍿',
  '🍩',
  '🍪',
  // Napoje
  '☕',
  '🍵',
  '🧃',
  '🥤',
  '🧋',
  '🍶',
  '🍺',
  '🍻',
  '🥂',
  '🍷',
  '🥃',
  '🍸',
  '🍹',
  '🧉',
  '🍾',
  // Sport & Aktywność
  '⚽',
  '🏀',
  '🏈',
  '⚾',
  '🥎',
  '🎾',
  '🏐',
  '🏉',
  '🥏',
  '🎱',
  '🪀',
  '🏓',
  '🏸',
  '🏒',
  '🏑',
  '🥍',
  '🏏',
  '🪃',
  '🥅',
  '⛳',
  '🪁',
  '🏹',
  '🎣',
  '🤿',
  '🥊',
  '🥋',
  '🎽',
  '🛹',
  '🛼',
  '🛷',
  '⛸️',
  '🥌',
  '🎿',
  '⛷️',
  '🏂',
  '🪂',
  '🏋️',
  '🤼',
  '🤸',
  '⛹️',
  '🤺',
  '🤾',
  '🏌️',
  '🏇',
  '🧘',
  '🏄',
  '🏊',
  '🤽',
  '🚣',
  '🧗',
  '🚵',
  '🚴',
  '🏆',
  '🥇',
  '🥈',
  '🥉',
  '🏅',
  '🎖️',
  // Transport
  '🚗',
  '🚕',
  '🚙',
  '🚌',
  '🚎',
  '🏎️',
  '🚓',
  '🚑',
  '🚒',
  '🚐',
  '🛻',
  '🚚',
  '🚛',
  '🚜',
  '🦯',
  '🦽',
  '🦼',
  '🛴',
  '🚲',
  '🛵',
  '🏍️',
  '🛺',
  '🚨',
  '🚔',
  '🚍',
  '🚘',
  '🚖',
  '🚡',
  '🚠',
  '🚟',
  '🚃',
  '🚋',
  '🚞',
  '🚝',
  '🚄',
  '🚅',
  '🚈',
  '🚂',
  '🚆',
  '🚇',
  '🚊',
  '🚉',
  '✈️',
  '🛫',
  '🛬',
  '🛩️',
  '💺',
  '🛰️',
  '🚀',
  '🛸',
  '🚁',
  '🛶',
  '⛵',
  '🚤',
  '🛥️',
  '🛳️',
  '⛴️',
  '🚢',
  '⚓',
  '⛽',
  '🚧',
  // Przedmioty
  '⌚',
  '📱',
  '💻',
  '⌨️',
  '🖥️',
  '🖨️',
  '🖱️',
  '🖲️',
  '🕹️',
  '🗜️',
  '💾',
  '💿',
  '📀',
  '📼',
  '📷',
  '📸',
  '📹',
  '🎥',
  '📽️',
  '🎞️',
  '📞',
  '☎️',
  '📟',
  '📠',
  '📺',
  '📻',
  '🎙️',
  '🎚️',
  '🎛️',
  '🧭',
  '⏱️',
  '⏲️',
  '⏰',
  '🕰️',
  '⌛',
  '⏳',
  '📡',
  '🔋',
  '🔌',
  '💡',
  '🔦',
  '🕯️',
  '🪔',
  '🧯',
  '🛢️',
  '💸',
  '💵',
  '💴',
  '💶',
  '💷',
  '🪙',
  '💰',
  '💳',
  '🧾',
  '✉️',
  '📧',
  '📨',
  '📩',
  '📤',
  '📥',
  '📦',
  '📫',
  '📪',
  '📬',
  '📭',
  '📮',
  '🗳️',
  '✏️',
  '✒️',
  '🖋️',
  '🖊️',
  '🖌️',
  '🖍️',
  '📝',
  '💼',
  '📁',
  '📂',
  '🗂️',
  '📅',
  '📆',
  '🗒️',
  '🗓️',
  '📇',
  '📈',
  '📉',
  '📊',
  '📋',
  '📌',
  '📍',
  '📎',
  '🖇️',
  '📏',
  '📐',
  '✂️',
  '🗃️',
  '🗄️',
  '🗑️',
  '🔒',
  '🔓',
  '🔏',
  '🔐',
  '🔑',
  '🗝️',
  '🔨',
  '🪓',
  '⛏️',
  '⚒️',
  '🛠️',
  '🗡️',
  '⚔️',
  '🔫',
  '🪃',
  '🏹',
  '🛡️',
  '🪚',
  '🔧',
  '🪛',
  '🔩',
  '⚙️',
  '🗜️',
  '⚖️',
  '🦯',
  '🔗',
  '⛓️',
  '🪝',
  '🧰',
  '🧲',
  '🪜',
  '🧪',
  '🧫',
  '🧬',
  '🔬',
  '🔭',
  '📡',
  '💉',
  '🩸',
  '💊',
  '🩹',
  '🩼',
  '🩺',
  '🩻',
  '🚪',
  '🪞',
  '🪟',
  '🛏️',
  '🛋️',
  '🪑',
  '🚽',
  '🪠',
  '🚿',
  '🛁',
  '🪤',
  '🪒',
  '🧴',
  '🧷',
  '🧹',
  '🧺',
  '🧻',
  '🪣',
  '🧼',
  '🫧',
  '🪥',
  '🧽',
  '🧯',
  '🛒',
  // Symbole & Emoji
  '❤️',
  '🧡',
  '💛',
  '💚',
  '💙',
  '💜',
  '🖤',
  '🤍',
  '🤎',
  '💔',
  '❣️',
  '💕',
  '💞',
  '💓',
  '💗',
  '💖',
  '💘',
  '💝',
  '💟',
  '☮️',
  '✝️',
  '☪️',
  '🕉️',
  '☸️',
  '✡️',
  '🔯',
  '🕎',
  '☯️',
  '☦️',
  '🛐',
  '⛎',
  '♈',
  '♉',
  '♊',
  '♋',
  '♌',
  '♍',
  '♎',
  '♏',
  '♐',
  '♑',
  '♒',
  '♓',
  '🆔',
  '⚛️',
  '🉑',
  '☢️',
  '☣️',
  '📴',
  '📳',
  '🈶',
  '🈚',
  '🈸',
  '🈺',
  '🈷️',
  '✴️',
  '🆚',
  '💮',
  '🉐',
  '㊙️',
  '㊗️',
  '🈴',
  '🈵',
  '🈹',
  '🈲',
  '🅰️',
  '🅱️',
  '🆎',
  '🆑',
  '🅾️',
  '🆘',
  '❌',
  '⭕',
  '🛑',
  '⛔',
  '📛',
  '🚫',
  '💯',
  '💢',
  '♨️',
  '🚷',
  '🚯',
  '🚳',
  '🚱',
  '🔞',
  '📵',
  '🚭',
  '❗',
  '❕',
  '❓',
  '❔',
  '‼️',
  '⁉️',
  '🔅',
  '🔆',
  '〽️',
  '⚠️',
  '🚸',
  '🔱',
  '⚜️',
  '🔰',
  '♻️',
  '✅',
  '🈯',
  '💹',
  '❇️',
  '✳️',
  '❎',
  '🌐',
  '💠',
  '🌀',
  '💤',
  '🏧',
  '🚾',
  '♿',
  '🅿️',
  '🛗',
  '🈳',
  '🈂️',
  '🛂',
  '🛃',
  '🛄',
  '🛅',
  '🚹',
  '🚺',
  '🚼',
  '⚧️',
  '🚻',
  '🚮',
  '🎦',
  '📶',
  '🈁',
  '🔣',
  'ℹ️',
  '🔤',
  '🔡',
  '🔠',
  '🆖',
  '🆗',
  '🆙',
  '🆒',
  '🆕',
  '🆓',
  '0️⃣',
  '1️⃣',
  '2️⃣',
  '3️⃣',
  '4️⃣',
  '5️⃣',
  '6️⃣',
  '7️⃣',
  '8️⃣',
  '9️⃣',
  '🔟',
  // Flagi
  '🏁',
  '🚩',
  '🎌',
  '🏴',
  '🏳️',
  '🏳️‍🌈',
  '🏳️‍⚧️',
  '🏴‍☠️',
  // Pogoda
  '☀️',
  '🌤️',
  '⛅',
  '🌥️',
  '☁️',
  '🌦️',
  '🌧️',
  '⛈️',
  '🌩️',
  '🌨️',
  '❄️',
  '☃️',
  '⛄',
  '🌬️',
  '💨',
  '🌪️',
  '🌫️',
  '🌈',
  '☔',
  '💧',
  '💦',
  '🌊',
  '⚡',
  '🔥',
  '💥',
  '✨',
  '🌟',
  '⭐',
  '🌠',
  '🌌',
  '☄️',
  // Czas & Niebo
  '🌑',
  '🌒',
  '🌓',
  '🌔',
  '🌕',
  '🌖',
  '🌗',
  '🌘',
  '🌙',
  '🌚',
  '🌛',
  '🌜',
  '☀️',
  '🌝',
  '🌞',
  '🪐',
  '⭐',
  '🌟',
  '✨',
  '💫',
  '🌠',
  // Muzyka
  '🎵',
  '🎶',
  '🎼',
  '🎹',
  '🎸',
  '🎺',
  '🎷',
  '🥁',
  '🎻',
  '🪕',
  '🪘',
  '🪗',
  '🎤',
  '🎧',
  '📻',
  '🎙️',
  // Celebracja
  '🎉',
  '🎊',
  '🎈',
  '🎀',
  '🎁',
  '🎗️',
  '🎟️',
  '🎫',
  '🎖️',
  '🏆',
  '🥇',
  '🥈',
  '🥉',
  '⚽',
  '🏀',
  '🏈',
  '⚾',
  '🥎',
  '🎾',
  '🏐',
  '🏉',
  '🥏',
  '🎱',
  '🏓',
  '🏸',
  '🏒',
  '🏑',
  '🥍',
  '🏏',
  '⛳',
  '🏹',
  '🎣',
  '🥊',
  '🥋',
  // Gry
  '🎮',
  '🕹️',
  '🎯',
  '🎲',
  '🎰',
  '🃏',
  '🀄',
  '🎴',
  '🎭',
  '🎨',
  '🧩',
  // Miejsca
  '🌍',
  '🌎',
  '🌏',
  '🗺️',
  '🧭',
  '🏔️',
  '⛰️',
  '🌋',
  '🗻',
  '🏕️',
  '🏖️',
  '🏜️',
  '🏝️',
  '🏞️',
  '🏟️',
  '🏛️',
  '🏗️',
  '🧱',
  '🪨',
  '🪵',
  '🛖',
  '🏘️',
  '🏚️',
  '🏠',
  '🏡',
  '🏢',
  '🏣',
  '🏤',
  '🏥',
  '🏦',
  '🏨',
  '🏩',
  '🏪',
  '🏫',
  '🏬',
  '🏭',
  '🏯',
  '🏰',
  '💒',
  '🗼',
  '🗽',
  '⛪',
  '🕌',
  '🛕',
  '🕍',
  '⛩️',
  '🕋',
  '⛲',
  '⛺',
  '🌁',
  '🌃',
  '🏙️',
  '🌄',
  '🌅',
  '🌆',
  '🌇',
  '🌉',
  '🎠',
  '🎡',
  '🎢',
  '🚂',
  '🚃',
  '🚄',
  '🚅',
];

const COLOR_OPTIONS = [
  // Podstawowe
  { name: 'Niebieski', value: 'from-blue-500 to-indigo-500' },
  { name: 'Różowy', value: 'from-pink-500 to-purple-500' },
  { name: 'Zielony', value: 'from-green-500 to-teal-500' },
  { name: 'Pomarańczowy', value: 'from-orange-500 to-red-500' },
  { name: 'Fioletowy', value: 'from-purple-500 to-indigo-500' },
  { name: 'Turkusowy', value: 'from-cyan-500 to-blue-500' },
  { name: 'Żółty', value: 'from-yellow-500 to-orange-500' },
  { name: 'Szary', value: 'from-slate-500 to-gray-500' },

  // Jasne & Pastelowe
  { name: 'Jasny Niebieski', value: 'from-blue-300 to-blue-400' },
  { name: 'Jasny Różowy', value: 'from-pink-300 to-pink-400' },
  { name: 'Jasny Zielony', value: 'from-green-300 to-green-400' },
  { name: 'Jasny Fioletowy', value: 'from-purple-300 to-purple-400' },
  { name: 'Pastelowy Błękit', value: 'from-sky-200 to-blue-300' },
  { name: 'Pastelowy Róż', value: 'from-rose-200 to-pink-300' },
  { name: 'Miętowy', value: 'from-emerald-200 to-teal-300' },
  { name: 'Lawendowy', value: 'from-violet-200 to-purple-300' },

  // Ciemne & Intensywne
  { name: 'Ciemny Niebieski', value: 'from-blue-700 to-blue-900' },
  { name: 'Ciemny Fiolet', value: 'from-purple-700 to-purple-900' },
  { name: 'Ciemny Zielony', value: 'from-green-700 to-green-900' },
  { name: 'Ciemny Czerwony', value: 'from-red-700 to-red-900' },
  { name: 'Granatowy', value: 'from-indigo-800 to-blue-900' },
  { name: 'Bordowy', value: 'from-rose-800 to-red-900' },
  { name: 'Butelkowy', value: 'from-emerald-800 to-green-900' },
  { name: 'Śliwkowy', value: 'from-purple-800 to-violet-900' },

  // Neonowe & Żywe
  { name: 'Neon Różowy', value: 'from-pink-500 to-fuchsia-600' },
  { name: 'Neon Zielony', value: 'from-lime-400 to-green-500' },
  { name: 'Neon Niebieski', value: 'from-cyan-400 to-blue-500' },
  { name: 'Neon Pomarańcz', value: 'from-orange-400 to-red-500' },
  { name: 'Electric Purple', value: 'from-violet-500 to-purple-600' },
  { name: 'Cyber Yellow', value: 'from-yellow-400 to-amber-500' },

  // Gradienty wielokolorowe
  { name: 'Tęcza', value: 'from-red-500 via-yellow-500 to-green-500' },
  { name: 'Zachód Słońca', value: 'from-orange-500 via-pink-500 to-purple-600' },
  { name: 'Ocean', value: 'from-blue-400 via-cyan-500 to-teal-600' },
  { name: 'Las', value: 'from-green-400 via-emerald-500 to-teal-600' },
  { name: 'Lawenda', value: 'from-purple-400 via-pink-500 to-rose-500' },
  { name: 'Ogień', value: 'from-yellow-400 via-orange-500 to-red-600' },
  { name: 'Lodowiec', value: 'from-cyan-300 via-blue-400 to-indigo-500' },
  { name: 'Purpura', value: 'from-fuchsia-500 via-purple-600 to-indigo-700' },

  // Specjalne
  { name: 'Złoto', value: 'from-yellow-400 to-amber-600' },
  { name: 'Srebro', value: 'from-slate-300 to-gray-400' },
  { name: 'Brąz', value: 'from-amber-600 to-orange-800' },
  { name: 'Miedź', value: 'from-orange-400 to-red-600' },
  { name: 'Perła', value: 'from-slate-200 to-zinc-300' },
  { name: 'Ametyst', value: 'from-purple-500 to-violet-700' },
  { name: 'Szmaragd', value: 'from-emerald-500 to-green-700' },
  { name: 'Szafir', value: 'from-blue-600 to-indigo-800' },
  { name: 'Rubin', value: 'from-red-500 to-rose-700' },
  { name: 'Bursztyn', value: 'from-amber-400 to-orange-600' },

  // Naturalne
  { name: 'Piasek', value: 'from-yellow-200 to-amber-400' },
  { name: 'Woda', value: 'from-blue-300 to-cyan-500' },
  { name: 'Ziemia', value: 'from-amber-700 to-stone-800' },
  { name: 'Niebo', value: 'from-sky-300 to-blue-500' },
  { name: 'Trawa', value: 'from-lime-400 to-green-600' },
  { name: 'Kamień', value: 'from-gray-400 to-slate-600' },
  { name: 'Kora', value: 'from-amber-800 to-stone-900' },
  { name: 'Mech', value: 'from-lime-600 to-green-700' },

  // Monochromatyczne
  { name: 'Czarny', value: 'from-gray-900 to-black' },
  { name: 'Biały', value: 'from-white to-gray-100' },
  { name: 'Węgiel', value: 'from-slate-800 to-gray-900' },
  { name: 'Kość Słoniowa', value: 'from-stone-100 to-zinc-200' },

  // Vintage
  { name: 'Retro Orange', value: 'from-orange-300 to-amber-500' },
  { name: 'Retro Green', value: 'from-lime-500 to-green-600' },
  { name: 'Retro Blue', value: 'from-sky-400 to-blue-500' },
  { name: 'Retro Pink', value: 'from-pink-400 to-rose-500' },
  { name: 'Vintage Brown', value: 'from-yellow-700 to-orange-800' },
  { name: 'Vintage Teal', value: 'from-teal-500 to-cyan-700' },

  // Cosmic & Space
  { name: 'Galaktyka', value: 'from-indigo-900 via-purple-800 to-pink-700' },
  { name: 'Nebula', value: 'from-purple-900 via-fuchsia-700 to-pink-600' },
  { name: 'Kosmos', value: 'from-slate-900 via-blue-900 to-indigo-900' },
  { name: 'Aurora', value: 'from-green-400 via-cyan-500 to-purple-600' },
  { name: 'Mars', value: 'from-red-600 to-orange-800' },
  { name: 'Neptun', value: 'from-blue-600 to-indigo-800' },

  // Candy & Sweet
  { name: 'Arbuz', value: 'from-green-400 to-pink-500' },
  { name: 'Malina', value: 'from-pink-500 to-red-600' },
  { name: 'Cytryna', value: 'from-yellow-300 to-lime-400' },
  { name: 'Jagoda', value: 'from-blue-500 to-purple-600' },
  { name: 'Truskawka', value: 'from-red-400 to-pink-500' },
  { name: 'Mięta', value: 'from-teal-300 to-green-400' },
  { name: 'Wanilia', value: 'from-amber-100 to-yellow-200' },
  { name: 'Czekolada', value: 'from-amber-800 to-stone-900' },

  // Professional
  { name: 'Corporate Blue', value: 'from-blue-600 to-slate-700' },
  { name: 'Business Gray', value: 'from-slate-600 to-zinc-700' },
  { name: 'Executive Black', value: 'from-slate-800 to-black' },
  { name: 'Premium Gold', value: 'from-amber-500 to-yellow-600' },
  { name: 'Trust Navy', value: 'from-blue-800 to-indigo-900' },
  { name: 'Success Green', value: 'from-emerald-600 to-green-700' },
];

const STAT_COLORS = {
  interactions: { bg: 'bg-[var(--bg-tertiary)]', border: 'border-[var(--border-secondary)]', text: 'text-[var(--accent-light)]', label: 'Interakcje' },
  newContacts: {
    bg: 'bg-[var(--bg-tertiary)]',
    border: 'border-[var(--border-secondary)]',
    text: 'text-[var(--success)]',
    label: 'Nowe kontakty',
  },
  interventions: {
    bg: 'bg-[var(--bg-tertiary)]',
    border: 'border-[var(--border-secondary)]',
    text: 'text-[var(--warning)]',
    label: 'Interwencje',
  },
};

export default function StreetworkClient({
  initialStats,
  initialMonths,
}: {
  initialStats: StreetworkStat[];
  initialMonths: string[];
}) {
  const [stats, setStats] = useState<StreetworkStat[]>(initialStats);
  const [months] = useState<string[]>(initialMonths);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    initialMonths[0] || new Date().toISOString().slice(0, 7)
  );
  const [editingWorker, setEditingWorker] = useState<string | null>(null);
  const [tempAvatar, setTempAvatar] = useState<string>('');
  const [tempBgColor, setTempBgColor] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'patrol'>('stats');

  // Get stats for selected month
  const monthStats = useMemo(() => {
    const result: Record<string, StreetworkStat | null> = {};
    WORKERS.forEach((worker) => {
      const stat = stats.find((s) => s.workerName === worker && s.month === selectedMonth);
      result[worker] = stat || null;
    });
    return result;
  }, [stats, selectedMonth]);

  // Calculate totals for selected month
  const monthTotals = useMemo(() => {
    let interactions = 0;
    let newContacts = 0;
    let interventions = 0;

    Object.values(monthStats).forEach((stat) => {
      if (stat) {
        interactions += stat.interactions;
        newContacts += stat.newContacts;
        interventions += stat.interventions;
      }
    });

    return { interactions, newContacts, interventions };
  }, [monthStats]);

  const openAvatarModal = (worker: string) => {
    const stat = monthStats[worker];
    setEditingWorker(worker);
    setTempAvatar(stat?.avatar || DEFAULT_AVATARS[worker]);
    setTempBgColor(stat?.bgColor || DEFAULT_COLORS[worker]);
  };

  const closeAvatarModal = () => {
    setEditingWorker(null);
    setTempAvatar('');
    setTempBgColor('');
  };

  const saveAvatar = async () => {
    if (!editingWorker) return;

    setIsSaving(true);
    try {
      const stat = monthStats[editingWorker];
      await fetch('/api/streetwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerName: editingWorker,
          month: selectedMonth,
          interactions: stat?.interactions || 0,
          newContacts: stat?.newContacts || 0,
          interventions: stat?.interventions || 0,
          avatar: tempAvatar,
          bgColor: tempBgColor,
        }),
      });

      const response = await fetch('/api/streetwork');
      const data = await response.json();
      setStats(data.stats);
      closeAvatarModal();
    } catch (error) {
      console.error('Error saving avatar:', error);
      alert('Błąd podczas zapisywania');
    } finally {
      setIsSaving(false);
    }
  };

  const incrementStat = async (
    worker: string,
    field: 'interactions' | 'newContacts' | 'interventions',
    delta: number
  ) => {
    const stat = monthStats[worker];
    const currentValue = stat?.[field] || 0;
    const newValue = Math.max(0, currentValue + delta);

    setIsSaving(true);
    try {
      await fetch('/api/streetwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerName: worker,
          month: selectedMonth,
          interactions: field === 'interactions' ? newValue : stat?.interactions || 0,
          newContacts: field === 'newContacts' ? newValue : stat?.newContacts || 0,
          interventions: field === 'interventions' ? newValue : stat?.interventions || 0,
          avatar: stat?.avatar || DEFAULT_AVATARS[worker],
          bgColor: stat?.bgColor || DEFAULT_COLORS[worker],
        }),
      });

      const response = await fetch('/api/streetwork');
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Error updating stat:', error);
      alert('Błąd podczas zapisywania');
    } finally {
      setIsSaving(false);
    }
  };

  const formatMonthName = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  };

  const getWorkerAvatar = (worker: string) => {
    const stat = monthStats[worker];
    return stat?.avatar || DEFAULT_AVATARS[worker];
  };

  const getWorkerColor = (worker: string) => {
    const stat = monthStats[worker];
    return stat?.bgColor || DEFAULT_COLORS[worker];
  };

  return (
    <div className="min-h-screen p-3 bg-[var(--bg-primary)] sm:p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="mb-1 text-xl font-bold sm:text-2xl md:text-3xl lg:text-4xl text-[var(--text-primary)] sm:mb-2">
            Streetwork Dashboard
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-[var(--text-secondary)]">
            Statystyki pracy streetworkerów i plany patroli
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-4 bg-[var(--bg-secondary)] rounded-lg shadow-lg sm:mb-6 border border-[var(--border-primary)]">
          <div className="flex border-b border-[var(--border-secondary)]">
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors sm:text-base ${
                activeTab === 'stats'
                  ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)] bg-[var(--bg-tertiary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              Statystyki
            </button>
            <button
              onClick={() => setActiveTab('patrol')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors sm:text-base ${
                activeTab === 'patrol'
                  ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)] bg-[var(--bg-tertiary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              Plan Patrolu
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'patrol' ? (
          <PatrolPlanManager />
        ) : (
          <>
        {/* Month Selector */}
        <div className="p-3 mb-4 bg-[var(--bg-secondary)] shadow-lg rounded-lg sm:p-4 sm:mb-6 border border-[var(--border-primary)]">
          <label className="block mb-2 text-xs font-medium sm:text-sm text-[var(--text-secondary)]">
            Wybierz miesiąc
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-base"
          >
            {months.map((month) => (
              <option key={month} value={month}>
                {formatMonthName(month)}
              </option>
            ))}
          </select>
        </div>

        {/* Month Summary */}
        <div className="p-3 mb-4 border border-[var(--border-primary)] shadow-lg bg-[var(--bg-secondary)] rounded-lg sm:p-4 md:p-6 sm:mb-6">
          <h2 className="mb-3 text-sm font-bold sm:text-base md:text-lg text-[var(--text-primary)] sm:mb-4">
            Podsumowanie: {formatMonthName(selectedMonth)}
          </h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            <div className="p-2 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded sm:p-3 md:p-4">
              <div className="mb-1 text-xs sm:text-sm text-[var(--text-secondary)]">Interakcje</div>
              <div className="text-xl font-bold text-[var(--accent-light)] sm:text-2xl md:text-3xl">
                {monthTotals.interactions}
              </div>
            </div>
            <div className="p-2 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded sm:p-3 md:p-4">
              <div className="mb-1 text-xs sm:text-sm text-[var(--text-secondary)]">Nowe kontakty</div>
              <div className="text-xl font-bold text-[var(--success)] sm:text-2xl md:text-3xl">
                {monthTotals.newContacts}
              </div>
            </div>
            <div className="p-2 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded sm:p-3 md:p-4">
              <div className="mb-1 text-xs sm:text-sm text-[var(--text-secondary)]">Interwencje</div>
              <div className="text-xl font-bold sm:text-2xl md:text-3xl text-[var(--warning)]">
                {monthTotals.interventions}
              </div>
            </div>
          </div>
        </div>

        {/* Workers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {WORKERS.map((worker) => {
            const stat = monthStats[worker];

            return (
              <div key={worker} className="p-3 bg-[var(--bg-secondary)] shadow-lg rounded-lg sm:p-4 md:p-6 border border-[var(--border-primary)]">
                <div className="flex items-center mb-4 gap-3">
                  <button
                    onClick={() => openAvatarModal(worker)}
                    className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${getWorkerColor(worker)} rounded-full flex items-center justify-center text-white font-bold text-xl sm:text-2xl hover:scale-110 transition-transform cursor-pointer shadow-lg hover:shadow-xl`}
                  >
                    {getWorkerAvatar(worker)}
                  </button>
                  <div className="flex-1">
                    <h3 className="text-base font-bold sm:text-lg md:text-xl text-[var(--text-primary)]">
                      {worker}
                    </h3>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Interactions */}
                  <div
                    className={`${STAT_COLORS.interactions.bg} border ${STAT_COLORS.interactions.border} rounded p-3`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium sm:text-sm text-[var(--text-secondary)]">
                        {STAT_COLORS.interactions.label}
                      </span>
                      <span
                        className={`text-xl sm:text-2xl font-bold ${STAT_COLORS.interactions.text}`}
                      >
                        {stat?.interactions || 0}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => incrementStat(worker, 'interactions', -1)}
                        disabled={isSaving || (stat?.interactions || 0) === 0}
                        className="flex-1 px-3 py-2 text-lg font-bold text-[var(--text-primary)] bg-[var(--bg-elevated)] border border-[var(--border-secondary)] rounded hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        −
                      </button>
                      <button
                        onClick={() => incrementStat(worker, 'interactions', 1)}
                        disabled={isSaving}
                        className="flex-1 px-3 py-2 text-lg font-bold text-white bg-[var(--accent-primary)] rounded hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* New Contacts */}
                  <div
                    className={`${STAT_COLORS.newContacts.bg} border ${STAT_COLORS.newContacts.border} rounded p-3`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium sm:text-sm text-[var(--text-secondary)]">
                        {STAT_COLORS.newContacts.label}
                      </span>
                      <span
                        className={`text-xl sm:text-2xl font-bold ${STAT_COLORS.newContacts.text}`}
                      >
                        {stat?.newContacts || 0}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => incrementStat(worker, 'newContacts', -1)}
                        disabled={isSaving || (stat?.newContacts || 0) === 0}
                        className="flex-1 px-3 py-2 text-lg font-bold text-[var(--text-primary)] bg-[var(--bg-elevated)] border border-[var(--border-secondary)] rounded hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        −
                      </button>
                      <button
                        onClick={() => incrementStat(worker, 'newContacts', 1)}
                        disabled={isSaving}
                        className="flex-1 px-3 py-2 text-lg font-bold text-white bg-[var(--success)] rounded hover:bg-[var(--success-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Interventions */}
                  <div
                    className={`${STAT_COLORS.interventions.bg} border ${STAT_COLORS.interventions.border} rounded p-3`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium sm:text-sm text-[var(--text-secondary)]">
                        {STAT_COLORS.interventions.label}
                      </span>
                      <span
                        className={`text-xl sm:text-2xl font-bold ${STAT_COLORS.interventions.text}`}
                      >
                        {stat?.interventions || 0}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => incrementStat(worker, 'interventions', -1)}
                        disabled={isSaving || (stat?.interventions || 0) === 0}
                        className="flex-1 px-3 py-2 text-lg font-bold bg-[var(--bg-elevated)] border border-[var(--border-secondary)] rounded text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        −
                      </button>
                      <button
                        onClick={() => incrementStat(worker, 'interventions', 1)}
                        disabled={isSaving}
                        className="flex-1 px-3 py-2 text-lg font-bold text-white rounded bg-[var(--warning)] hover:bg-[var(--danger)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Avatar Edit Modal */}
        {editingWorker && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black bg-opacity-70"
            onClick={closeAvatarModal}
          >
            <div
              className="bg-[var(--bg-secondary)] rounded-lg shadow-2xl max-w-sm w-full p-3 sm:p-4 max-h-[90vh] overflow-y-auto border border-[var(--border-primary)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold sm:text-lg text-[var(--text-primary)]">
                  Edytuj profil: {editingWorker}
                </h3>
                <button
                  onClick={closeAvatarModal}
                  className="p-2 rounded hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Preview */}
              <div className="flex justify-center mb-3">
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br ${tempBgColor} rounded-full flex items-center justify-center text-3xl sm:text-4xl shadow-lg`}
                >
                  {tempAvatar}
                </div>
              </div>

              {/* Avatar Selector */}
              <div className="mb-3">
                <label className="block mb-2 text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
                  Wybierz awatar ({AVATAR_OPTIONS.length} opcji)
                </label>
                <div className="p-1.5 overflow-y-auto border rounded max-h-48 sm:max-h-56 border-[var(--border-secondary)] bg-[var(--bg-tertiary)]">
                  <div className="grid grid-cols-9 sm:grid-cols-11 gap-1">
                    {AVATAR_OPTIONS.map((item, idx) => {
                      const isLetter =
                        item.length === 1 && item.match(/[A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]/);
                      return (
                        <button
                          key={`${item}-${idx}`}
                          onClick={() => setTempAvatar(item)}
                          className={`aspect-square p-1 sm:p-1.5 rounded border transition-all ${
                            tempAvatar === item
                              ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)] scale-110 shadow-md'
                              : 'border-[var(--border-secondary)] hover:border-[var(--accent-light)] hover:scale-105'
                          } ${isLetter ? 'font-bold text-sm sm:text-base bg-[var(--bg-elevated)]' : 'text-base sm:text-lg'}`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="mt-1 text-[10px] sm:text-xs text-[var(--text-muted)]">Przewiń aby zobaczyć wszystkie opcje</p>
              </div>

              {/* Color Selector */}
              <div className="mb-3">
                <label className="block mb-2 text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
                  Wybierz kolor tła ({COLOR_OPTIONS.length} opcji)
                </label>
                <div className="p-1.5 overflow-y-auto border rounded max-h-64 sm:max-h-72 border-[var(--border-secondary)] bg-[var(--bg-tertiary)]">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setTempBgColor(color.value)}
                        className={`p-1.5 rounded border transition-all ${
                          tempBgColor === color.value
                            ? 'border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/30 scale-105'
                            : 'border-[var(--border-secondary)] hover:border-[var(--accent-light)]'
                        }`}
                      >
                        <div
                          className={`h-10 sm:h-12 rounded bg-gradient-to-r ${color.value} mb-1 shadow-sm`}
                        ></div>
                        <div className="text-[9px] sm:text-[10px] text-[var(--text-secondary)] font-medium text-center leading-tight">
                          {color.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-[10px] sm:text-xs text-[var(--text-muted)]">Przewiń aby zobaczyć wszystkie kolory</p>
              </div>
              {/* Save Button */}
              <div className="flex gap-2">
                <button
                  onClick={closeAvatarModal}
                  className="flex-1 px-3 py-2 text-sm font-medium rounded bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={saveAvatar}
                  disabled={isSaving}
                  className="flex items-center justify-center flex-1 px-3 py-2 text-sm font-medium text-white bg-[var(--accent-primary)] rounded hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <svg
                        className="w-3.5 h-3.5 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Zapisywanie...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Zapisz
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}
