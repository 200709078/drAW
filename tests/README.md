# Regresyon testleri

Node.js testlerini proje dizininden çalıştırın:

```sh
node --test tests/*.test.cjs
```

Arayüz kontrolü için `npm run dev` komutunu çalıştırıp Vite adresinde
`/tests/storage-ui.html?tahta=1` sayfasını açın. Sayfa test sonunda `PASS`
veya `FAIL` sonucunu gösterir. Test, gerçek uygulama arayüzünü ve bellekte
tutulan sahte masaüstü depolamasını kullanır; kullanıcının çizim dosyalarına erişmez.
