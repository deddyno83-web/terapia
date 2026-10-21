/* Schema della terapia. Modifica qui farmaci, orari e giorni.
   giorni: 0=Lunedì, 1=Martedì, 2=Mercoledì, 3=Giovedì, 4=Venerdì, 5=Sabato, 6=Domenica
   Se cambi gli orari, aggiorna anche SCHEDULE in worker/worker.js */
var TUTTI = [0, 1, 2, 3, 4, 5, 6];

var FARMACI = [
  { id: "eutirox",        nome: "Eutirox",        ora: "07:00", giorni: TUTTI,     dose: "75", doseGiorno: { 6: "100" } },
  { id: "cardicor-m",     nome: "Cardicor",       ora: "08:00", giorni: TUTTI },
  { id: "forxiga",        nome: "Forxiga",        ora: "09:00", giorni: TUTTI },
  { id: "lasix",          nome: "Lasix",          ora: "12:00", giorni: TUTTI },
  { id: "cardioaspirina", nome: "Cardioaspirina", ora: "14:00", giorni: TUTTI },
  { id: "luvion",         nome: "Luvion",         ora: "17:00", giorni: [1, 3, 5] },
  { id: "cardicor-s",     nome: "Cardicor",       ora: "20:00", giorni: TUTTI },
  { id: "inegy",          nome: "Inegy",          ora: "22:00", giorni: TUTTI }
];

var GIORNI = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

function doseTesto(f, d) {
  return (f.doseGiorno && f.doseGiorno[d]) || f.dose || "";
}
function aMinuti(hhmm) {
  var p = hhmm.split(":");
  return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
}
function dosiDelGiorno(d) {
  return FARMACI.filter(function (f) { return f.giorni.indexOf(d) >= 0; })
    .sort(function (a, b) { return aMinuti(a.ora) - aMinuti(b.ora); });
}
