import type { CaptionCanvas, CaptionPicture } from '@/lib/live-wire'

/** The canvas of a 1440x1080 broadcast, which is shown 16:9. */
export const CAPTION_CANVAS_FIXTURE: CaptionCanvas = {
  width: 1440,
  height: 1080,
}

/**
 * One caption as the server would draw it: a palette PNG (colour type 3) of
 * white text with a dark edge, cropped to the part of the canvas it covers.
 */
const CAPTION_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAtAAAABYCAMAAADr9TAyAAAAP1BMVEVfX1/W1tabm5s4ODgAAAAA' +
  'AAD+/v4AAAAAAAAoKCgAAAAAAAC4uLgAAAAAAAAYGBgAAAAAAAAAAAAAAAAAAABZbN7wAAAAEHRS' +
  'TlP/////AP7/stD/LlD/j27/IoOcXQAAEdFJREFUeNrtndnCqygMgAVrQRB8/7cdWQ0QVGx7pj2H' +
  'XMzSX6rVj5CNODy6dPmLZOi3oEsHukuXDnSXLh3oLl060F060F26dKC7dOlAd+nSge7SpQPdpQPd' +
  'pUsHukuXDnSXLh3oLl060HUR2oi8dqzMDnUfiPtnl4rpDmAH+n2iJi/nXAmeH8r8B+zmybX7xosT' +
  'Yps9ahugOrAd6DpSU5RTJb0fqlOe7xEt43B+iLFZBRTj+9mn+ldKITrO/zTQABN+nX2HlAAfHHEk' +
  'EatEKDAYKF2xiZQGYcUYhxQDYceLDbtmP+nt+zlj+u4U8MsLb1wxlDkt50p2oD8E9DpsUlV8OoEq' +
  'HBpl3j6Y4Qc8N11kxFAghs7kvs/+SbDpouiTCXfFLOfXlyZU2GVNkEzktov814B2CHCm7moZc3/n' +
  '5yY1oFVKEt0OXRPCtw+GI/2JqvH4rSN5PmfPhDjDeJs8dCHVuTddMUrQH3bLm51uockurmr/KNCt' +
  '91Ru63giHAKd/Y1tq2IO2RWgU42nMNQ9n9s/NqAXf/0V/byO2yJAKSFPJyS1UdKbMYzzRaXLMyC1' +
  'uRcNqkGdm0Bns053oA9uqmhUD0DxBaBLUfoO0Co/pzFLVqAK7TRZ7MA5jHfPel3n0QBsEN60caQY' +
  'CsWVqlGZ49N/nbxE1vb9izlaSXZgM9XvvbkbSzPQ63Zau86o3wJass3jUJs/ZFxvJzK4O8YpeMMY' +
  'o2VWjKLzVfIa0BPzj+2y0PxSuFPDqVHj5wbZ/7UNmsKRB0IIrdn72k8vO+HEJbKeyGw0SIsGoCkA' +
  '2jysC/MonPa3NPSpg8NfH+MQcNPd3tQNfA0jV2ZCbJ95j5q1A81fBjpgSuDlM4+TNzqczq1Pnk2R' +
  'Upp4nwwnbAgmyWZbHRsP0XlYsZ+NYim581e0DQ6G01Gr1Pe44slsCLfj54CW5666enkMnO4qswuR' +
  'mWDpXAqxWrH8eKHAzHgN6GemyZzNMTicBkjVsMFLqKV32OzhdQ6EIouHKLVBUJkBS6FqUTkJ8bfu' +
  'qbHSnQWCE408Hcze2metScEqI9ZZseKOINgwJr4b6AsRKP7ymLBszu4R8JOZwC+s6VAvgshcEPss' +
  'oFiEwP/PNaBTlcSmXTcTdN3fVw9S+6Owq3xYkBBUVB0VDRSsj7b4Xz1UXBJ+EegwGVT1WRDc0pFf' +
  'DbTThl7VDOM4z8HbMe4OIZgd2DpGeDco/OFwKtwH+rUoR5h0I/wDi2Nn4zKu0y2gWaE1KzbEgYEy' +
  'lIsQxUN50znQ8zDGaaunVqCnrwf6CJ4a0C1jgpZZnOo2T3emdqVeVx8ymG3M6z7Qea6uBNp77LVV' +
  'BA10gydLT0LPR0BPeVAxzm6zqhybd8FAGWzYIZjqgGiFepHGHnLGUAR6nUFccbe4DpbLpQK0+NeB' +
  'ho622s3CUtYU6AupuDm6cZezd7g61NBWNREcGRbjkY7DMmTq9bqs3mXNNSbdYKb7TKEzHvQN92IO' +
  '99wdOJBItKiERQ5lN6xcFpQ6MZ6Kl4ryGN5qc/wo0FDL6E8BbSp+ruG27OaGdN7Q5g5NhatmQ4HT' +
  'sBSqtx1on0pxy9G2GhnVRxLDYQik5uGHab8XZtQSvm4mwSlhrwPd8HN+AuiQHCBxSTOyWCe+BnTL' +
  'GKhlxOeAvvpwYopBIob3gCjTQDnTj/tAk4NwizN2nnQt7Q5/QlJMtznOTTQTcxQi357S+NcCrW5E' +
  'OVrHhHvm776zoZdkXXOzYXoP0ITWBQJ9yQmiQRNOYciIiLVWsD+MIUqOI7ZY9yzOb5pbqcG0X2Co' +
  'g+9TbSyNlHhrRu+lU2rj68Cmhj5xPtm8xbEsbtiSGSPjtwMtzqGRL44ROXhXoxx3gabHxwegC//e' +
  'aiCHwJ4csZ7YEihjd5xCjgG9zV8HsxtPk2BcvH8hT07X+LtUUCnBueOn6uYoDh1qE62Pfr5ifb1T' +
  'eJ4l0a+OkSCUys7i2Poq0OvLQKvwKPFyDDJOqSZkB3P5EGhbgeEmyuJXiedcfENAeoahseCrDiHz' +
  '7lHn0Ic9DURjQPPzpEIFaP74aqCdZ2RTRFCnmJJypap7+FrGaHBLz0JF7JEBTQ5zfS8DTc/sRZAQ' +
  'tyyFuUxJKmC1jrIGbauQGAeiRwk4rczunZ9UQTtqNGxeUzeohtanyqkCtPh2oP9ErR1Nc3Cy3ObB' +
  'TfWBeFwH+mmAecUp1FXnNHXoYmkc93UnIUZ7xR+0W2BE1VTnpQeaGMbh3oX4njyvtdBvyxRGoH0J' +
  'r9Ff/NtT339AQtRuvjq7zVM2NsAJ0NRGrzb/5S1AOyW7mZKrCa2BOK+DlwAEWAPQpRqMlgLXRR33' +
  'vGTRZVAIlcbOGVJEdzlTmAbihbZ1k8Lk5v1ssJuDZvr2qMbfATRUuM31JbVQRbZqsyTKMVQFRjmk' +
  'SyAu1FOcFvOR3SqOKpqlQB/Z0CQB2tYX+kK3Bfpy1ukDBVam6gnCts+drLoaJoL4mX9Tpr6Heq32' +
  'bvs8O9CHlYiXgdYnLudS8JzGVC/a0KJ86kuang6uGw24ittAx9V9Dt+rc4fZn3eE92mPj6ypbRGD' +
  '+WidgStjHWcfpQOpb7M5rOJMBu1O8QxMB7rMDVx1kPlheIOUPLPHDaCz0+QuEDB1MxV9F2iRpCPL' +
  'CJAqo0QR6Hz7Syj4KoCWp57Bswo0K428H9yx8mkR3iFv2QNkN85NKNeugNKRZvu5bH6KftwCWha+' +
  '2ggCh7A0J4lF3waaBQU9RkoCl84UFkWZSSQsBysp/H8T0HHCPZdhXYcldYY70Hlu4MZcF77WQqkk' +
  'cefTD7KyFlxNfdvN6Ca4wrL61qT6JIlFKwg0sOqXPEGJsBZ52adGBrTXkbw0155FvAxaL6INaLM/' +
  'rJYBHkG8MrO0OtDpHX7NGoMlOb5Cp+gJIxqKkwQWh4m+GgQ6ycpN96Ic8Sy5fxkUbQxWSJW0nwm/' +
  'iBxumhBFGnedh5j4DqlvV8A+rtXqa54XaBE8uf7NQLs2cLypEWHjGAj01VujGdLGYFoWmO8A3QyU' +
  '2B3JREeiVR1DkZ4vgroMmBySw12t+jbQMokAipTLmj2Gbgw7tKFrYTt6XtJQbD3A44LfDLS4kf9p' +
  'HaOTuJEtjjxp7FbLLzv9OqM7t9CH+FwvJeg1LO4XBdAabrzmt23oeFFD3vnjBGiC+WaiFuWo7Smk' +
  '5yUN8HcIDewj/jNAqxsZ+tYxOguEShmLMRuDHJXd/PVYyNnBNYsjBhdcFDZXrbeAVkUW/UoIqJoQ' +
  'lPVijrJTWQ608RtwPTLGyaWhEf0zQE+gYYb40BhdTVWpNgU9nejcGYp9FuNcF3D5pRrkwIDcOwGE' +
  'LMMdoEWioO1+BBWS/wdApzMrUyvDwUABe9JEoE1C8HBhTHcA0WdL+uALgPYRNULm60A3jwGlHNkG' +
  'ukoKKmTPCnFVl6UMe7D4uozx8nUYvHd+mZItCX4nDAlVQ3eA5klNvoS4mWObgQ6BxZqtwvI9jMs5' +
  'mFOeLiW/BnQ13fTOMQBoEnfjrwe91q5FUouquNtAMxhNS90jsE09+JLA5DiqtsucQhUznHPc3ZUD' +
  'PVW4XBCTQ+StTqpmYQL0cfuwvHJqfP4a0Crdjv2ZMTvQQ7Dk5kPv+Q8DLRDHy+uqgJlKzaSbxUnD' +
  's5L0CXUBXKJAUwToaAXN2EIX54trLjHCTjUHqYBoZQwgJftTNnQSbv3UmN2GpuFWDYfjbwKd7Zqi' +
  'SWYwWJxDWdmrYEhEJu5RMAREGhpoBtqOX5+pDzDaqgpTHLVvZihqM2EjL4XkaKp9U8yOAZIX254g' +
  'HcM5T2oyheT5bKtY+P+Brlpo7xwTgV6jmqB4ZfqLTiGSG4dAuz/QNY9ywAq4Kb3kaKCqJNLVsmMl' +
  'RgEnksy9cSkXDIQ2y5gvMdJIEh3ZguUudi23LsQAfDUbMCGq5E6C998Amg57EwqsFO0wNXAdaAr2' +
  'MaVAT+vyTJFOgtBgycgaiTzs+wGi/amatmCJR2xiCg6heMeLoosB/jYNlljkGtEHI1pHTkKrBFZ/' +
  'VDnRHy23ezfQgZKxMWrXNCYCTZJNTchaKaTbvSXvAz1c6bgUm7owABvM3/GKK1afb3WgOQR6THh2' +
  'vdSiZUCwBowMCXKy1CJHmkHO/gvNVl+TBQe/fT0KMHG4eJAFLSL5BaCHqdZeVZjCncQ3bh4TUwD7' +
  'Iw9AK7dByTSX1qHNq/lE8jageQvOrposnEwmvydz99HIpHTdy1KxFvdaCNjGboyApNaJroW69llQ' +
  'hQQs9goPV3lw2GjGxWAGvDcOPbKkwwYAU/exknrX9i83OdyizPd3QFnEwCvK9AtjxB6BoCddAA9a' +
  'AUKgK4wFL+ak1Ayqaf0oCjX819Vf6KIbfFbQicR8Z6UBCN0va0AsgqRQwKcB52orsHDxZM5VQZju' +
  'nnRer9MB82z8qXro6K6fJpRfGbP3phrAlpOloW3CFaDX8LRsrU/IB9qlIWYHbTx2XkBDMJmU0k3c' +
  'rhnsMAt3A+jMiFoz+8T6yBTO+YpzIsKrvuY9osZqFh6ytg2wy2MldsHKnlG/89KgGLE6pVO+MGZf' +
  '84J5MDxzFQK2uql2oAVcx1f4NOd06rj/M8/VRbF2BT0gsWE8VH4H6N2T1KAAetK28MnO7zH4cfbC' +
  'GAaz4unucLJiKwjcY2+VQ7hzM7Bu3L1XtaDpfo71k7V2n0l9+y03BMfTdMhM4xntY+IApxShNrXN' +
  '7/1eN3KYbTkE2uFCnVl6DrTxe4ZYUga3w6a1engpsG5sNJOoPgkrgPKy433zb648k3qjQP6M6nJM' +
  'Q4P9kTN8dOVvY6ldP3zUgv5AcVKsMPDNz+bQr9m3EsYCN81jODRSFBrshA5LBvSml8JLEg7etGNf' +
  'S7TGBf0MaK8t04qhvFYPTVro9s5Ju3ssgQG2IoWuMfen6pH5aAmvuJIt3mEBSxV2VLEfp/OTDNP0' +
  '2VeWvx1oWY9ZViORzWOSjKpvIzSc7Y5Ks15plEMcxq4D0EyeAO0qylagoM3epDm6l9g2JX2nFVj1' +
  '5US7wiXxvzGrdbc1aNqFl1WLx2BqcEzfc5D0NkOMjdTU5o9fAtpnlZYWoJvH5O8x47CV2wnQbLoI' +
  'tC6BFidAC5nHh0mxj1RfzPkcd/DPf5GbztS8fHOkiT8yL5hS9IbckmdhWM0489t17OwEZ/D7ymeS' +
  'tWGC02aMc2aYPmxwfKw/dA0vkF2SL4yR2W4hEdXN4jskEv8+tLV4Sjk09QSjDhtXKkCv0Hjd7Bgm' +
  'drYWLH83Yqmfou4ajabkddcy14PL8WtiamVwWQZG1XUUQbd5S6+F12WqBLD3SL7vVSl+DeioA30H' +
  'kqQv9hAbvopXxmTFmCd9N2SRJYAvSThQGibiVgV6QGoT4ssN57S33P489at1U5VK5iz17fy7eFsl' +
  'pnXGPClULTzAcuvW/uDpvUcdqjRW/WGeP7PrG5qFJuRg+u2sJx1U28a4XAx8O9ZBy3T2wBfo3Sbh' +
  'x7nPioYmz6ITIvP5GBqV+0DtxAmvAWSPDwAt/Mqep6PjS11wRy80cAi3ud40URYnSNo+sFq8X8co' +
  'SKwreTx+EGhkD9p5R+CmMQxZTRWupfMKdJmun2Q+cbvrQNv+t3SAW69EMo+u/Ox3AA0aItp+0R5R' +
  '+6skx2vw3StgQIN0Ls8cI1sN7Xa5jynBqmZ/M0d0rMpTj98Eenuy6sAIqLy7t2GMRPWvkHue3HaW' +
  '1rISj6PezqbD6TIIYwuIU5hdhIalbOp4rSimQIOISjjh+GR1Z5TL64suEmupTZvUBefi8bNA218J' +
  'yjD81mCmpHjLGNa8tfzg2bBzH9cvsLYiaO/DgV2EAuuvupCCvwf0+fqmG26DEncW3Uulvqzx+G8G' +
  'OlbCCCHePka1t7OpIcTOc5/huEu1Ina76t6H3aZwOK9BI+/wjLUMUBe2vyOocXYRtFj2cUml56dh' +
  'fwTnX+0++obcT9XGrukmnqlc7d7Kvq0fr14Ob8WZVyuN7Nvilb6mPyRrvnjfGVC3DDM7GZT4Uw/3' +
  'XwR6R6gdR/ZH188uHeiPTwaro3S/ER3oLl060F26dKC7dKC7dOlAd+nSge7SpQPdpUsHuksHukuX' +
  'DnSXLh3oLl060F26dKC7dKC7dOlAd+ny/8t/DZpacR1M26YAAAAASUVORK5CYII='

function bytesOf(base64: string): Uint8Array {
  const text = atob(base64)
  const bytes = new Uint8Array(text.length)

  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = text.charCodeAt(index)
  }

  return bytes
}

/** A caption on the lower part of the canvas, where a broadcast puts one. */
export const CAPTION_PICTURE_FIXTURE: CaptionPicture = {
  left: 360,
  top: 940,
  width: 720,
  height: 88,
  png: bytesOf(CAPTION_PNG),
}
