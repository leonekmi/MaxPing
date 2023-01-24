import {
  addDays,
  eachDayOfInterval,
  startOfToday,
  startOfTomorrow,
  format,
  parse,
} from "date-fns";
import fr from "date-fns/locale/fr/index.js";
import { KeyboardButton } from "grammy/out/types.node";

const formatStr = "EEE d MMMM yyyy";

function dateToKeyboardButton(date: Date): KeyboardButton {
  return {
    text: format(date, formatStr, { locale: fr }),
  };
}

export function keyboardButtonToDate(str: string): Date {
  return parse(str, formatStr, startOfToday(), { locale: fr });
}

export function getDateButtons(): KeyboardButton[][] {
  return eachDayOfInterval({
    start: startOfTomorrow(),
    end: addDays(startOfToday(), 29),
  }).reduce<KeyboardButton[][]>((acc, date) => {
    const button = dateToKeyboardButton(date);
    if (acc.length === 0) {
      acc.push([button]);
    } else {
      if (acc.at(-1)?.length === 3) {
        acc.push([button]);
      } else {
        acc.at(-1)?.push(button);
      }
    }
    return acc;
  }, []);
}
