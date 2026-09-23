/* 113-icons.js — v4.67 "Emoji retire, icons report for duty"

   Sheet 1 of the custom icon set. Twelve flat-vector icons, generated as a
   4x3 magenta-keyed grid, cut to transparent PNG, recoloured for the dark
   rail (navy ink -> paper, paper -> deep slate, amber untouched) and inlined
   here as 48px WebP data URIs. Inlined rather than committed as binaries so
   there is no missing-asset window and the service worker caches them with
   the script itself.

   Applies to DOCK_GROUPS (the seven rail buttons) and the DOCK_ITEMS that
   have a genuine match in sheet 1. Anything without a match keeps its emoji
   until sheet 2 arrives — a mixed rail is preferable to a wrong icon.

   Both constants are top-level `const`, so they are NOT on window; they are
   reached by indirect eval and mutated in place.

   Escape hatch: ?noicons=1 restores every emoji.
   Console: NBIcons.report(), NBIcons.apply(), NBIcons.revert()
*/
(function () {
  "use strict";

  var OFF = /[?&]noicons=1/.test(location.search);

  /* ---------- payload: semantic key -> 48px WebP, base64 ---------- */
  var D = {
    money: "UklGRtIEAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSFECAAABoLRtmyHJXtD7fV+MbRzbO9u2ba1s27Zt2zZXWNm2URHxvYvMrMyKcyJiAvB/KmpmplKIBkWjBBucCYDR8yy9/PJLzzMWAGxACix54rNf/kuSva9ePGUZQAeiWOtFVj1nZ/WVdaADUOxNekzuJOmeopP7QztTLMGc2DJlLg7tKmA/77F1zw9E6G5fxnaR+3dnWPJvb+X+1xLQrgD9gLlN5qdDIV0Z1vTM1ombwFqImoVgpkNwAGO76Ach9CNB0RzCIZ1w/37EAIxacK1N9txx/WVnNUz5yb2N+8/zQxsEmL7Xg58n1v7x9mUbf8x2/GY8pE4w9PjvSTKnmJKz48TdEGpERz5OxpSdtZ5j6iL6IQ0Bh/Af58ATd2xQPJoTB575+RhIEwtw/2UeaE3A/iUwcm+EGsPi7iX4oQ0BlzEWkLiJ1CkeZyriKNQZHmQsgImbw+o2Zy4h+zeTRGpW8SIYeTxCzc2MRWT/bBQEUDzBVAQz14YBhhsYy4h+IkJlOfdCeCussh1zGYmPQCv3MXbguZMHKorHc2rnpLeLvAIBCDiZ/3ibxH+/oHewT0Vk3JtkzN7kKZHbj76WqY3nxaAABGMv/YdkjtXkJN9ZG5jzn+T9JT4riqoAC5/05h9s/PrerYdBA05lry+PXBFWAzEAs666xxFnnbTv1kuOB2AQG/oCe314j2fD0KwB/aoJAMGEF+kxu3tOkbwcJn0AUAu1JqhXjLzI2fjdPlDBoAVY/Ly3foo/vXvXXtMgKFAMwNT5JgcAhjI1oGpBUKyIiuC/DABWUDggWgIAAHAMAJ0BKjAAMAA+tUacSicjoqG40kwA4BaJbAC9+8DudqRuvYBvQftgOfJ9C28d7zH/k35mY7WotvPCXfivhYkD0gQYFqQu6TfXxW5gF6iUC33BwU2YpKQWRgoo/prplxYaN8C1c60ZQ39gAAD+zebv//SRH8yIKmtqB8o+LWtpOUTt/xRZt2aFQUNKZalX6XXHBSFUVypM32xRp0u28ANYKxJp4oK9Qh6HMn9igkIU3W6e/5U9UMuw5lz+TIqIdo/6oQiYumw7PuK+7OLPLzhUIWV8tHbYDtxTYaHpb2NZ9LK8Po0lDW2GX5BeV9zwgckwcHuoXVjw9v61g4AUJxK7ODZGMWYkpQBOVJireZrSpdNWMwv3D9+QOHKjrtUB6EcuKLUGkeP3g8l0X+09RVMEjiqKROTmefjf4N10U4qbbyjkWIqYqg6SeVbvPNawU9InCWPXx990rSpOFhMls2/zHzoEFyvAfUNaZH2BSjUvEO0dXCmV6VVF1Rv7I1iLKomrGgymFo/Z5iiAK9N/wLT8HR2ETU3dYh6SUX+B79LK32i8gJHo2/WA8IXLwOFLa9RqYIp9BiAbP6fjoyGn6Y4FW3y4xrg11RI4n3jY2eS3pshjLFUPRSSsnHn5mZ7gNaXFrFnGxPdSKpkwrCEMCiT0SWTVE3DRE2+oKPTVR8MRAfxOlvnHTNwZhgl+OgkpRHfDEkPakr/Ze+071so9e4lofEBXaKjyRfrCohnS81I08tvVZ8R6gwcGynE9Co/P/OdRcrEXSEfbPOcBeSORAqyxqHEGu8oQAAAA",
    growth: "UklGRroEAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSO4CAAABoEVtmyFJ+uKPyNHu2FY11hwbl2vbtm3btjer1rZtG2PblZEZ8V1kIZvXETEBaI2KksahtJRqlEqMRmnBxI/3hTSI0gYA2owdAQVoPM8foRoEgGx25NN/8xqY1HPJN2jYgTvd9asj6XeALsFvG0TjDpJMYhfXQxqDknYPMiYd528M1RigFB5i7BN+AoXGYfC4Jy3vhmkUyuBWcjWdOyEjMUZXFuAK+qU1uxU5GToLAQBVSYCz6VaNAKbMGALJQKHm6vv3gipncASTDdNgNLobpFPfl9MYvZLktZBSBru7xO0OAILSGs/yQ6hSIh+zGCfcTCRlMDVKeCiw3bkQVckrkBIKnRZ6z5h7oy2UBBi1NuGJUL0W3guDSl4rIwoznE2s/WUsFIAtFnleAdX5a16ZjdK43bGkvVB13G7CDPIO6I3ep78+G4NLyRnhq6c8QPLbf0jyKYh+lRt4XSYBTqdfVAcAey0g6RP3tdZtHqWNszE4ln7V1ig58PM4ZsK3gGF0PhuDvenXTQXGf/fhCOAkRrTuPYVhRWYTYCfn4p2A7ZeRxb2kdh09uS8w1GYTYPq6hAfB9F/MuMjbgOl/RAvOUiYzjFjreRzaYiwdY38N2mCjzboDyOh1dFlAng8AI7xnzOtgkB7XF8My6vQVrwIG9cMollJXX3fQ2S9F9RieyWtAx22Avj9uWQE+IUk7LDMNqI4/cUglb8RFm0TDMxOtO3zA9blK3mLiabPTErzExDYio56mZWPCRYycj3IY6Zy3/lrgTR87Hw3H8KJ31l9b3Rd0pK/FWKZvAd6nJ30Naph+ubpH7IaiXdAPNXOWLl545Djgcbshskv6o9+MpYsXLj2jitd10LEml6vpK1p16dWzZ0/RumNNLlfTX4x07tWzZ69Aa62l1DN8CY1Z44VkztNhvlAoFPJhGObTYRjmC4VCIR+GYT4dhuHTT4yDpJ5jo30FBhBs+/L7b73dCN9657mREDRJ0dJItZRqZQJWUDggpgEAAJAJAJ0BKjAAMAA+uUqeSyckIqGuOAzI4BcJZhFASvAd4+7AGNubdgG8X/6ZH/DPLzM3GVfXJqbUVFpQ0lEgEI6OfI0JYMA+NdVWCSTZU7Zu1xpVooAA/v5hVn/uTK6Yj/PNAZRScGp3ntCYQG70/UG6/HyrwWAr8uwPHOSrIM5pjFVsqSqQILWQnk7dvMlr+9NCJlFKlLzbBPVKQ1aYxbUZ3iFYe8Byaz2nDxRszIUTQMMl4c3a8eygAv3k0Ev5TYu0dwMYATnbjFi0bsTZaoucClW3r28KhADZBrh7uTnAXJsEg2ThmuhTWB2fCEPsFjOWX1qw3MNbBRU2LBScSTpbc34CLfGKa+gS9d8c8YzfduAna4qgsYA0YxGGDDAOtGBPPC9SckJEc3X+Tuxfkhb8k4aXuWkjCqaQEyg8krVHEHLQPwg9R1xYbVPSUEU+kK0z8+aqBkKJWSDRxW/P0stu///Vf3U//8qFd5wWFvDhXc9wxxdsKXw5IFxHoJYT40P8qgDSG+2Epnf1ZHHgjlorgmC0bZoJx7UZDD96V8J/VeLqAAAA",
    hq: "UklGRnwDAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSD4BAAABkHNb27E51/3c39j2TGzb/ANWnS6V/4dts006p02VFpVtv893X+N53mfiKiImAP3bRRe5oHRbMSSqmmetkVXd64WoOk3Lac2DAdpFVNFVJR0g/341IKoAalZfujwb0BQElRevfr55tgJAzZrzL0na7jqIC+Ywgl3rKtaee0nSe298tA5woVRH/PDmv155StJ7I0lPXp8OCaNAQ5ZGkt4bezRPvxQaBKVLLpqR9Mbef+NBZAI4t/UhAye2O4TDQDLxgbgnzPAfWWNUwzx/Xbs1L7L9ADISj9n7owsAqIul2zsbWgDp3Yg0zBv57tgESC8UM2hMM5uQ7xrE9WZmSqQlnAWNiWYzY+N/PRk3J4bZLtMTMNYimIQeBWWDFn9P0v6RLB9UBOlG7zLS29KdbD53+kyEp8+tRzf9UaPtKW5WUDggGAIAAPAJAJ0BKjAAMAA+uUigSqckIyGquq1Q4BcJQBlEIYEr//8WARyTEK0WfMuqoJwifz6qICvtJzsJ5/3BCQyG1O8SPU4t8CpXUHgN8INipJvl6ZLOIuGhjAAA/v8a3f/gxfr7mfv/3FjDDsRKM2fTqV0GWiezaCijPfU/3/4Zx/3B1J4/Ya3EIB+QAuguou1SnHj6+1R0yPxHL0kGpJxZ/YvT3+9n0WgazS194krMydA+atgTYC9/rX9Aq3cTSunNmVFVw9p3oP3W///Wsv/63T//9a3DM4n/TuRlUd33nk2VTNBfjbtaCizX1EQe65Ulf232no5ibmHdNmll4dHCRIfj07VBS7TMBVzY4Jz4ur0i2PrUwAjdegw8TCwzQXHbItxlXl6TId/0Jniu+u5lgfpKDEJzj/wVWbql7cy5k9GbDK5vRgJPZKv2d4K2Xq48xF9DfIxzsnEDXO6/PtOt6c4/b+m4emQKETLSt2jAVnIsghtGpto8hy72Tugop2xA5pDp48ATUwJeBv4HIrOGNa1ZdKv+ue2MFdnQ4Qs1DfJqXXSM+7Di4HYLq6fmcRqre/bd2ZYJd26SEi/ihYB9wPE/i3qyDi10nHPR2QXBUMebVG7l7nppwCC2+ifLCnYIWmjNUvAok4K/DMCcQvV/lOa3Lduq3Jhr3mhbyCkiQ9itljfeTLy4aHz0AwjKHiRlzNvLYVobWwAA",
    people: "UklGRuQDAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSM4CAAABoEPblmnbmqtqv2/btm3btm37Z7Zt27Zt20b0zFNVawQbF9EPI2IC9H+52aCyyqQYB0+QNFElxThAFoLVgmY78+2fv3tsE8lqFkP/REmKpqBN/qPxwS0VZEFSDP2hyRZeeHIpavlx9HIp2WFrVdLMK84mWV8s2Cm/pfT74VMHPUePxgn+SaVZ7xrKyIsXl6xb0FU0/j7jtKPcm9zHzTrVj+DgD08SrEvUCqTinnOabnE6LzIXueA5s5eqLpVO9QQ4PvucCW9y0hxzgwO9cltfzqZW+GmyBXve5mPnmuIvCpB5UrHbaQ2JG3UNidbEFbqT1PC8QgfTpD9RGm6wu0uXcrvd0vKxOlv1fUPmQ+1Fbsvsog/JgDNyJoUOUbunDOB55SEvUpoKD2uJnjtA8hMVOyjqQRJQfDXN0yte8zJ2xsm/INGc51LoEMJyPXcy92gi3UKuZa7Wkj/QPOrtPSYydbSJdQ7JfeRUqsJMP3qBwtfTBYUF3iEX9p8pqKtFaaaHPHsae9BU1UQ6lwSJszVRNWTxj1LJfskUUrQWk+Y+51+cAu8vJm34kzu4/7yBNN3TUHD+PXNetZqmvnw4FArPrSlt9iI4gMNzW0orPUKhwKjLpzaTZGHIq5CcwoXSdq+BO43u8P5O0vkUPMHjCpKi1qPnkHlHc70HJdMxF3h7Hr1LBk8spSBVurAkajvoJXqZPpYeL2nHGslPVCUFvebjsxeGT74o2emz57LQ5MMpJY/jQUUp6gyA4i/rFBL9mDhWb7gDHFOTac1zX/t7HBfak/31mF3GmD9eOn0lmdqnWGDNufRdmVC8T2VC+VKzrz7vZJJMzbEKql8MkFPKpZ5zShngPNVDFdTVQgxmW9/+g9PXX+7bMVqIwdTPEy2xy2m3P//hJz///OkHz9522m5LTaoBjVGtE02k1hgHQrJQVTGYJFmIVRVMg9RM/5cDVlA4IPAAAAAwBgCdASowADAAPrVGoUonI6OhtVK9UOAWiWdqYagei6PAFOhcQERAoY9OtU+OFtq1xbMjg6lMQDIAAP7SZn//IVvDrS9xNsFr/VsrzXTEi0BsDscrptA9B03JABF5tf9HUISoXpXMNRq0ESDbUPKC8EFZZaQ+4Oln/FjrxvThUy23MLdQ0guEeCrNojLPOx+Pd60puTBHnTB+2s8Bz1CpT07O8cFbf9WRbhl2Fvcu3L1zCiOE16dZCIJFU5P8TK1sAtjPjEWhSOsDC5gAvq33MPZZRoBt2iJQy+hedo3L6uQCf9/jP+MqZ/xoxogAAAA=",
    ops: "UklGRqwEAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSBQDAAABoCzZtmnb6mPMdZ9t27Zt27Zt26/2X9m2bdu2bb+995pztML2jvsBETEBGgd7SjZao53cfI41Vp/GLKWRcCnpcbhAYyQfBe22jBb6KecXptWO28qG5mNO49/H/yOC7x6HncyH5FqEDEQQUPPbpGbDUTXmcuocGXLkHIelSkM/nBpoBkFhLQ3ZNPXaH1OC8+Za9DpK4dlVJ5cNwSy9CGRulmQfEMAVSsPQeF+0amqOHzPB+HYDmUb9gLw/l2TeoXoLyNwiSW9QgBuU+uvVbPbtvokSceoc819KKby8wfSyXkyS67y3Xn/jlQ2VJJl0ODXQqAky66h3VzJLU/0DcH0aIzeN72dTl8iQoxQO9aoX01TSGC0TdanL21IlTam5yQUiIqAV/0wh62JJJ/143qRa/YEoEM0zZ9XC936zii6GlwOCf96HI5Orq+tc4P2H6P77bf/Cf+vouC200m91/ebc1UG7ydTV/RzqyBClUwZy5t81JNeTcI6S5OpqmvyfXKBkukcOaHFNGt990d13ndk9JfWYdDCZ/iP+nMtcAzX3x8mdIpfolNlHSZJXlfU1nq6k7pABSpcNq/FMgzRphv8j2oIfn3mtRen0mCQbhGZY73oKQOG8KaVFX6AARPOUFSZR/0lH/A4BkLlUctdUn0eh81dLyPu7j1YGiGjN60kaTydQd6hrdlXVj+uOyLQXvphQJiVbn9KBXPYcxN11M9qC36Z0kyrfntyhNPJe/SXdSNfMjho/VZVu7RTAlkr9mGY74t6/IoAS3y8pSQdFAQg+u3znic366bg5BSD4d+wu+95JABS+n0KDtTFpzKsUgKA9aM+crfGSDUKqdAl1G1HnOtOxsJIlDTZp/r8jOvSceVJuAzGf4DkyEL0EkDlSaTA20Uu0KEEdnUomBy1OG5Bc079FExr0+B+0GCvXgF0zPMs7m81/3lcRELy235znNzlXboNS0uR7TihpEzLBz5NIWmZHuWnwJimlNGuj5FZ5RGM8Sa6hWmWS2TMAJ1gledIImqZbddXVVp1EpnG2pZSSjdIIAlZQOCByAQAAEAkAnQEqMAAwAD6tSJlKJiSiIbVaqqjAFYljAMt2Ir3kdGuhHtaT+mGetHzPOdp/lVijrAg3Vqk6ckIC0ptIOkQncd5+5C0nbichw94JVdgAAP72UH//ZF//7Hp//9hsd//QVtD3/0Wuyvl179+3//9E3arfQ6x/mvhP4qB073rK7Ohhazp/7F1jAr+8B4uMZMcigww8LedbdxubrcU8pZhznzH3CRRcUExFf+eM2UDVcZvE5Gqhxv+gc6lBHlted+yseUSmOcGlQdzTAECmqZ++n5Qn/NG7JAgQtI77xMRBpr31QkRygvrIaOB77PfPDgm0nsoiICId2r6jp/fYHv//D5Xex6qUvNfrxL3Fg4Uwffif5qj8YGnJjFFQBHBSDqC4G9qfLy8UwoBqIHsh7KFWasJ777Tl2VMbNlW8zXttOECGOVbo/zEwhFCdm/gI//+Dq//gy7//wUn/6Fizf27/8nUyY/dUPtH+f8jySRsAAA==",
    research: "UklGRvgDAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSCsBAAABkFtteyo23y+Z2SV2vAMz8wCueAR2UjF0tABnAVfhpM3JAjwAk3T1Vb5X+kNtREwAfltjTVQxNpYgvolj0HbjwYOHxR88OF6FlQgi1a8Y/TSsFLMY5U8f2fEMSiTCQvCMHBzPwEqxOUYjHc/DiiY63oARTXS8ASOa+IsXYAosJAqZb4XJJeOp6DsLYCddey4jPd9D0GRxn56KDDp+haCpBDt01GRwTK9JUP6aQZNB00dtLZ91Cao+6ILgBb2qElwJTpXFIDNVkJKXwauyWKEuGNylV2UxqW5e3dz/T6e6FquKWVhFiaqQ+TUYTQwZt2HzzCZjFj5UQHIshGTBf6jK1ctfLql3P3gVFieKKXvE5E8bRU6CoP7wzu07KW9ulUGgXJBfSmziEsFvCgBWUDggpgIAAPALAJ0BKjAAMAA+uVigS6cloyGuOAgA4BcJaAC98MS7r6AMJ6skuZDDFlseeGt1Uzn/peY3DmLymLmCK9Ty+2CWeYt0uOBNTEBaRblbCldgS7hfKX7+NiE3lXv6r/XuTxtOGhmmehAAAP79vuW7WFuGD8rTeFHOsANQum6+xugw+/fr8bSG+2Vo55uuWTbPtxGN4q511/ZvDlAEEvbTTsLQYf4ua4x8Jxjn4d6AQI1jOMXd8EOOf9z/ZnzkN7q/ZlG1VsWcZ3lpOCwkM6B5vyHo80KFa31/9uQTYeBhwoszYWsilhTcyxraNLgMym5PGycrGk7jh4wzvZRc9TyJpB0acrIxNvk2Xq/wtrH0XLbVO5/E5//cBY9TvcRP1abAJjrivUz//K8SczHvO/szf+wS53UEpLeUuwdLFuCE2L4zjfXLWwUIN6Y/O6dAEax8nHm3AIvnT9ZkvPRmQJTodGkfA9PulvJen4iiftaclk6HgXdIRpOYJrEZwomaUCNkRrFRxD0xjQm8KB696w9iwr446+uyY+AeWWfc5/H+6FusSAdf9Ws/fGoeRRC/GEzA0kpJ8aybcEaCydrv139oCl/XjtU1FotVs/WjO8JWHb367OblCQp7H4KoFplv/YfIKboF9aLf7nxN6Jomrxu+kZFxxC2WHA6zKlo/6a+otZz6U8fhF+am14BejuLwEu8YrH6nmSf7+BYLRvvMn7PwzZitJ3CPBD1fP2dDb6mvD7TjJangaaBS+8y6LqXdedp/38yX0ibTGme4FPNlcPAG7AKcRCl5jAHGPxt4/eP50FKn42cCGGR/Eun5yHp1q/zVSkpZa/i0IEEzeUUje/yeUepSx0E1Zmra/l7cSss9DMbsUTJO7yYLsJuPI+l+Y9ilHRn77cQAAA==",
    idea: "UklGRl4FAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSI8CAAABoLVtmyFJntDzfREza9u2be+Rd49s27Zt27Zt27Ztb0VkvKuOzKprImICGBF6jME9xGCD4U5l8P5ZgMnXOe6mO+647shVx4NgfXJY9KqfNOSXp88KDniYeekQuwiMd46knHLOOTXS74cOwwH2uJYuA/O8pZKLhixJemQSgo+/4hd5wwljK2f+75RUX3p6ZRLGPiZLungKszq3Kb5UVuuenho5MP0bvy/rtHV/QEkd9nQiw9nibEKbwHpK6rKkspCFKWYP3sJspHdK04mSbiLQPrCCGnVcejMQDG91dkldJW1HNPA67EU13V1OZNQNsRpjvO9Uusp62nzcK7RD9Apn6l53jd6NDF/94VncBua9CIxPtTPF7/14I2CGVTjGSB+o6SrrbhyMoR3Hua2krlI5mkj9whDZUZ01Wp5QY8PX/2bzUQJT/VZKN015eySzGh9ph593Hc0ipyh1k7QZkZZLgblP9HVpush6fphbCycAgZWVSrtSfpsdp63DyGNbZH+lViWXVQi0j2GRHRgpcoGaNlnbEun05HcAH/5cyXVZVxINvIXFRc78U/esO15kFdWV8ueMNoz5NyW0GL76YyrfHTSp2ZhfqdRkPUawmd/QGmZV/73y14kB546Sa5KOt+ij7HXDRN5mmC1zLCMZkSOUarI2IhphbIzWY0xsBs7kn5YyVNHnY2EARtfGRF+p6qfJcTCjQ7P/RDZRVmWj5Qn0NbKNUkXRj5Pj/XFm66kM1ejTUbH+BBbKRZVFSxD6E9m6pJpG8+H9CSyhlMr/lT/1XHT67H6xpPKfRvpibvpmsP4Zf6qXc09fHzAVxkCu+rUkvTcPOANoYRiT7H7V5VuPzTBjQJ3/dQbXYgjRGDECAFZQOCCoAgAAsA0AnQEqMAAwAD6xTJxKJySiobVYCADgFglsAL2RQN8RsftoueO9FO8AbxxgAH85foqzkMyVj90OoH+qG+q/pWzB9C0xxvTt57iR/Xnw/dwgK/M+ZAN/UQkUwn+O+YUZLKeOP+YqN28fnlVTW0pf/02TMTEqAAD+z6F+klhQ+kCPzVccI7DJDlZ5DexDJWocRUrimZf+k4e87wiLYBK06l3Tk/hfUig9PhfC8aUjqBcnoe0gOygnoUlHhN0+LJ+U6IF1NTSjuP466s4A5QwLIsS0QISebFg4S2jvIP8//zL4sTPlutf46XH9EpWYbRlUXTYht3Xj8j/tlGfv/0MtUBs137Ryvg43O/ZDiXNfXBsTvM0mXk7mxxiNrjr71tCnCZSmfYvF6eNxeGBe5vzzHHBbSywQUnu0wbi3Zzv6xEgs6fhkS323f9gnFhqL7JWksPvnQ9psvhTTfi+110pU1hXV3UK8+MZFzcy+emQaP65IwXV73qkwgRwzoWrOF1N7cl89Xm3VKvRbYdn1Cj91Ooy8Dpz3uP+H8g6NPfeATqkuDwC8LBvCMgMjUEVO6hERl0NuKd+xnmVC9Rj9Utd22dqkgaQRm62kcx+xxjUFW3lAhSKi7BMI6gNDisU8SrWqbUQY2OdE9/vwq6kOcODG6jYre8u3p9fPS+f48/ldymm1fFyDSyhKjng5ETu6PTXU+9e3/LafKRUZmQIp8Q0C0U2E+OPP9fV9nRAikPUQuBj5gfm34HrHzvqXvDamr9Y33x9aDlm+hweiB/93eKLdjRCWDymvqjNsMZGxLxr20/77kiICFMEobkkuf/tWqwQ0Jlzjs6esKkKH+9wRf9fXJ0zf+tLVX6ztME/TJyFt8HiFmJh6mDMkA83h96G2iCEaoqGlJ9AAAAA=",
    decide: "UklGRugDAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSOoBAAABoLNte6FBH9D9JFnbNn+AvZ1tV7Zts9puSxuVbdv2ZxszyV3MO/NushExAfjSleSlxI8CJA8FiBfULgHJhprFIZ9PY8o/LxuJyqAx4a9njUR9HjHGFPuOXK0L61RjinwkV+nC2qj8BMmPzq5EZvW1s4uRVPkICo7bsm33P+STbTu2p2/b8zf5ZNv27WsaQ7KJKnGGfn9vLjqTwQz+G0UxSRtljknaKIr/5UmoTApHbEyf1n0sAskgME9pvTj+VSOPqn/QeaFjU+gMGq3p6Ddmr0wGIxl7ijgeJtNGRt7WZFI4zNhTzF3QaYICr2i9XYBKU6j7L50nyxcFICkaXWjp2fGnchkMZjPyRdrGUCka2wOw7ACdInKb1lvMETC5BOV+pvMWcUGaRks6BrA5zWAkI38xj0GnbQrB8r4gt8Jpxv4cvy0JSQiKfKAN4b+6UAmFxhGdP1q2gU5o9GHMAGMOhEkYLGEUQsSZuTQOhLIpF8xT2jAOQQNQqPkPXQiW1yEANDrSMox3RSCAwWxGQTj+VS2hsceGQccm0IDBBv4XuxBi9kiIVLjMMCOOgwEg0B2HXKYNYXUOCIDN9j/n/f94D3QCUtD0ZJBrYHIACpPf/O7954NlRVIgKFSlkufK5ZFdI0AlmSAB4ssEVlA4INgBAACQCACdASowADAAPrlInEonJCKhtVVaqOAXCWRlukwKNiQPX6qd7y5/xyLLSel/85HO5VPb7Q5eNTiJrogDOq6Kf7hBxbh65Yw50TG2gAD++jC/CX+fFs7c1JF0Dz0RNs4VT1Djxa2pXx8GBRoJHrzgwoAYjqXQkNHzhMKmd/M9MBGUXcFggA6owKlUxDs2ioXhQRYvtMzqhg12nL7pNKED0JkEbE/mi/qGkHIuyqMIAKx1dXc0/pfScBm7YA6ZaDhatPBa48KFLan7QrMF7cU0/rp2CI0dw7nGxsohd5vdGvN3HHrpC8n9DN2ugHoFokj1l0sa/kxTZewVjPtTipfKrcUr1BpkRJk7c+JNhSBTnDvlyT5xatShW/xEU5rWLDslMiTCiZ4Qtc9Ok/K0Wdq+c9sHeoH99i3zPVLPmS2ZJiAzNFNg9NVf8OKTEoEeVf/X72PXtTCYrhUm5W5pbty8DmMxlzs9xFTISN9RhWXzs+UdKEUJ7+yUwWvzHuW0ilF2DTtacdc3hSHgWG2xP1MfCCgDl+1HMEiUf9ZGD7/x4KINYOCzuSu5Vh7M4coDxp2lmfIa7l44HvupGto4q91jHE0rRSJ8kj1PcnGUIh3nlAIM2/6xnFAA",
    reports: "UklGRqwDAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSGQBAAABkGNtmyIr319V14BoYAFO5LAAUg2J3B0yd1uEO5lL5q7XF4AtwaVPyYdWd/13AxExARjqrkkp06wUELP22NGjx7KPHtsxAqYZ61yHO8ImX42EbULw94Pw09eu2N2CrSeYv2f3nt1vmFjfs7sFU8diFQt6drcgtW7Fn9771Aw9u0cZqXOFgQUrnoGtc7VMiK8geU5K8WmeheBKqWdZAgxru65IsKT/w7tvLJpnMZvl8xwupirFVOq5/M/iOgNLBz6GybiqIKbBdsj/rilg5O12I5oYuBBOlY/7tXGHdCg7DIimxI/dS2EU/XMBrKZUxeu6GNIlZZ5b4DQl/hgNoynwCQSaPLfCaUqsJsJoCnwFgSbPvXCqUpgEoymwzwg0eR6EU5XiNBhNkYNGoMnzINz/rkRfLqaZsP9y2MOfvvRPDlqRf4m0+ln+4yxY/FcwYtPRo8dKHj2+fwIEmQKNBtniyhsMXVZQOCAiAgAAEAsAnQEqMAAwAD6pRp5KJiQjIbjUnADAFQlsAMAf9aT9uoYDCbtNJ3lH/Kf6phgrXZYGlxZ5MHVwJNDYjqG4QwS5WBbmef1St0LLcfUSoYDxmuRHbXDvF7akv2DlpXQsPAD+/BPodok+VBJNr2ucCX5BVSEfDXzgNOdK71/f+tIUWG5Bn7rbhV3oTbz1VhJP9StdIaDHtBkyw/mWu4DOfqzHn/0w28+f21kK2zOK058MYehtbNly9K85S8mRz7XqQl4/twLNAMiLWOupjwurhhQG5+eC71gK0Qr0PApeyGDdFdflGuzc8msTQa6PHS4D1KkOd0xPEPLAo0NcPux3NJJk7CPw+3V6ezZieBpN+V+fcMkMd8qRJRRsuAJQ+Mut3Kw7+jlrYuxZfnAVtoDclKrRIO0NjE/FYEFm6muvkRVUAm7uzRe5kq+YW0i7BU9t8ym32PNhV7Olwj9/1eSxFuO4ApgRQGeIqcgPKNrdQ/gfrmztslKUv+/HEAwQyc70Zke7iA7uu/VRF4JsYqsjnq3cGItl3A8/jyDPbbfITTzx5h63vOvQy5H0VYBwlty/KNbrmASgE74sdmrfV1jIUyyPkJLG5VdywX4ywGLtlTn7aw+1B5kslFv+m0AHobfLPT119qUw1izhgSnRwn1/7RCamKujeBCN1X3OG8V97/DhzVVZNmjiCaUQ3rbcgn7fddxebrZXDjqY/1gGJ6TsAAAA=",
    trophy: "UklGRtYEAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSEUCAAABoHNr27E9Oq/rfmLbVmXbtu2ksvUPnJR2xrYr27YVGw+us3h139/M9BExAfgf1Sig8yIIKh4E/fft2+953/4RkJIETW8yYNoWWopDLyb+73A8omJEAZVuRv+ZjRAHqOTL341Bu6FIlSaPfvThRx98G+abDz768KNHm4oCEY6yzJ5ABDg8lsbXzp27HObS+XNX4/RxOCDCfnJFzdotz9F8Gc+3rlVzCXkAUc5achOAb5j5yvgdgDXkuhyHQeQDKC+vM/WV8h0pJ2fI4XCAoNY5/lxJ8VCIx6HlvuWlehAAikeNY4GdTHwlPAAZbPYsFAAiTCZfgS4LsVrwGDkHUY5I+a+NMzGU5ivjOIw3+6GSSA4cZjA936rKLZofY1ynyR8Z58Ehv8O9tG9bv8rUT8a3mnxNPgqHgqJV3icv/EPzY/z7T/LjWiqFoGjwBgO/Vx+KYhUVD5I0P0byYBUoildg6HMZzQv53BBAUaoo0OtclpVm2dVBgBN4dOWwknFpMTegnINfidyLjEuJ+YpGAt8qdb9mXFzCb+qJwr+i+adMskKW8PPmUIRU1LyPhY18rDYUYRWY+6NZjtnvywBFaInQMTYjzZLucILwWq7WRebwRoNyijJYDh3uGkla2gXly4BDqzeZ5WR8rwNcMIc5F2nMa7y0EC6MlMNCMmXBlFyO8hICqPSTpSwytV+qIKBIkwe/M5b6/UPNRX05PEyvz8Ab8MWd20nJt+98iYC/0Osv/gRzdmzZWvKWHfMgvv6NLvLqQvwnAwBWUDggagIAAHANAJ0BKjAAMAA+uU6hS6ckIyGuOAmY4BcJbACdMtU/97l9gHNB1mw0YwP0A6DDpAeYD9b/2d97T0IegB/duoA59/2Jv2y9Jd9FUzcsDSBM0EDG9h0kp6jf3xcu6zX+eZLWbLJeBXrJ6QCnqaAEkGdQnyDAAP708APyzSPW0lQpr+yM/Hgn4TCEjRsMRm+OonEM/xLFP9wjwsGQHv8xvPsM+N12ybr1sp1dFfP/KGwq5s+HztFYtmEazFYUU97SKmrnQj59aNCnpeIf36omS9+ewEVAkEnAjmsKHre5710b41kONloaL+u48+Tih+hc4WPaJV2L9XZtyHiUC3i8s+1zpAO7mciIbkE17dEsQ5OvxhHtqIBwqqmR4bKZ2J2fwyeYG4jlr/w/7sd5P65BuWa2Ykkbxohp+RrHPoNVDnbiKcAknTeaLP7UtrJzU7Tsse3BbtslWbRecbh8IU+KMa/dNw9o+QmL+Jo2LRUIGXZbens+nGXsOGr9HAdsw4n25EFTAQgoyjRzqO2riiz+v+X8OyHrlC3JTlNaJtkQF7cxs/z8jqOq36NLHPsiGkKJVuXtQmeoO+bfeHSrLM0vaZX0xEhGzCy3+i0//8tWW82zZZ/L3queul+/hfv/xOf/8sF3RdKN/D89weP6TxDwMMewXce/pLu7fDpD7tY3K/Zz5PHQ4Nco9lnwZjg+TjF9c93Vqh8vXnitSd4Ub/yKl1GHn89nZovzF5XDSfckpx/64C2TN+HTgbVVVW/xvTwojQF4cl22JHF1xeHTdYeii+aKIebDGkMjM5175J/J85f1//Guvu80hJgAAA==",
    market: "UklGRigEAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSIACAAABoERtm2Hb+f6/6pija9u2FdvW6CQj27btzIyRbdvOPrFxjcIX9Omqvde684iYAGwWVaW2BIBaq1IzmDS8Dv9XqQmDo/3qzx88f98pnahNi3tY6H9+YoRoDYj0u/z5bzfx/1fC1kBh2/hdT7p7nX9bpSbECv7/NNcNs/XWWlOsqio9lgMgahrNKeSeqKYYLQHAYCn5UtdhXYfuv9MuOy+aN3/+pNFjR/Tq1atXS1OzQUZBx69MdWHTypUrV37X/e2n77z77qv3joaWgeIRbnLOOe+9DzEGpt8NW8riZDqWj8WheKO/OcFgKWNCqmNXgqDzd8ZqRM6HKQXF4/RViFzZC1LO4lS6KgS+J0g0WMJQBce7YRIEnb8xVuNk2AQoHqHP57kjTIrFiXTZIt1oaIrBfMZsgd82QVIEbT8y5vJ8GopkgwfoczleDptmcThdLs8DcxhMZ8wRY/COM6BpovZThh5iDN455wML/+oUyYD2V8Mm75zzgWXX//rJ8/duBUWyytCPWXLNjx88fcelx+235bQhHQZ5VZ4iV7728O0XHLHfiskD2lBWjMmgGB3Ch0NR1ti6OmuNqohIBoPlkWfCQFVVBMmappjE8MHIhob6nHX1BhnVvESu+bpSqVS+/rLk15VKpfL1Vx/vDk3D6G5W8RnYJCj6nfdB8CGEla++Vvz6Kz8HH0L4/LE50DQocBwdA7+sQ88v0tPxLGS29snoGcmJYkREFP3WMtLzNTV5DO7kRga/cQAUAASdf3rPTfFRaK45kZG8AYpCgwvISG4DkweKXT8Pf19Xr1IkWn/5X+w+BIrcioaJfZHYZ0oLFPkNAJUyYgAYVFNUkCgq2HwCVlA4IIIBAADQCQCdASowADAAPrlUn0unJSKhqrqsAOAXCWNjPllXwve1K+7Od5lRwa1FRAEQ0uHAl+QlLiN74IDsLQ5iI5xIY+4dyZ3t9YgFlUZPcb9D73l3cqJOGAAA/vlIr4s0MPVJmSE8Rih3LElg3+b76srof/jXhnUGG8YwVxPwvaP+IpFVqHac9/3Bf5V/c5kZDZ1re4UqDQuaOC2AodHTSTdu/kSxRaIBovuKjVOMAiwYpVyuH//H9+nNNrqt4jift4lVTrQZDrXAXj/tnq16To7K7kreHfnzOlvwV8/kLyS6EKR1Hq8bDn3QDA4uCc3RvZO56bVXMXn1BEoaZuRvHgbYfM4W329R5ShnUvMpA1aoEUXdaSQVFODdvdbCbTeZWUf5YTK3iFggZmyiVc8w0UxSslKujGlNYQWg17SsyR1/n6cInmcrLh6OH5Ql/wSl8iAmq49B1n1lyLTP9zKP/RylyyEfAb4GKoi3AksMezZOMv3O9XXyQQmvH5kgsXoAyiAAAA==",
    dashboard: "UklGRugCAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSO8AAAABgFtre/LmFdhOMgMzdTmZg2rOCjgE8xBmGiHMI0CbjlHSF5B+MFUpImICUJNywUpScAdDyTILw2D89PQs9NPTxBA4AM56H6hEHwcYByT26F2rEtTvtAsJCBSNopJUJg/xJ0ulQjlb7t+DbOlkbQVdKqbwR2KD3pRn7UUrz2+0DQkw1nxLJXrfyTgAhsbldCrtzKSuydgMXacyaWcqvdkBhr8MPufoy/ZFS/DJYOdSuKMNkSwpm6JCpCEq3JIj4BvSNk13CJvxybnVL+VRr8+Ng4UgMUMBzkIGJzB8vH90eub1aP94DCK4cmSBhlMLAgBWUDgg0gEAADAKAJ0BKjAAMAA+uUigS6cjoyGqtV6o4BcJYgDJbWF//Vf/p/+cBqrxtAVT/mAJNAa7kGuEAUpe72LhZEVMTVsFu9/yq0wOK1gcpqraBwaedBakWFOQ92CnTAD++hrX5LLHe73O2G5tiuI7KYCR/Jx7Kj4Wau8QQiB4a0jLeItT9jb9deu9AGSImYCaMuthlxiN4BKvQbWKabtE/C/F8TNdPMl//xoFTKcHKtZg+uKqSG8xuRW3CF/G1r4wDM/n7kPztw62baLKr6GqR3GtRF+x8qqGGl8b1C7J8WpUbTKMhjmaP/LocFa47nP35777bBs+0mHiVTTaHNe37trHLD3YzzPiYMAj17lXEUvPvf5Bv+bqdKkPO7iNvP8PtGi+3+MIYeCWrazMPsuGFykHkvmT23kQk6Ck+qhfcr84/rVrUCrDMGt+RuCickdlsLz4VPzJfHxf4izIULobnjrfufovMgoUaeHj6H5ZsnoSriKGXtaGSdnKtvyq/hRhupL5/zXLft3kkn2t0rRDL5+CL4/PMUD8kaTb9YgcALhLlwR4hFxRmNrHUyvbQQaMK7LSb9GtWUyMe4dBW9k/zfjpoPvBcPtfpFV/+0HO2LAGw08AAAA="
  };

  /* ---------- reach the lexical constants ---------- */
  function ev(name) {
    try { return (0, eval)("typeof " + name + "!=='undefined'?" + name + ":null"); }
    catch (e) { return null; }
  }

  /* ---------- who gets which icon ----------
     Only genuine matches. Unmatched tabs keep their emoji: life, personal,
     assistant, saves, slack, zoom, clients, hr, orgchart. Sheet 2 will cover
     a house, a robot, a floppy disk, a handshake, a graduate, a medal, a
     chat bubble, a camera, a magnifier and a star.                        */
  var GROUP_ICON = {
    run: "dashboard",   // 🧭 -> dashboard monitor
    people: "people",   // 🧑‍💼 -> three figures
    market: "idea",     // 📦 -> lightbulb (this group is Product)
    empire: "hq"        // 🏗️ -> office block
  };
  var ITEM_ICON = {
    bank: "money",          // 🏦 -> coin stacks
    decisions: "decide",    // 🧭 -> calendar with a tick
    team: "people",         // 🧑‍💼
    product: "idea",        // 📦
    research: "research",   // 🔍 -> document under a magnifier
    financials: "reports",  // 📊 -> folder of reports
    invest: "growth",       // 💹 -> rising trend line
    market: "market",       // 🛍️ -> trolley
    milestones: "trophy",   // 🏅 -> trophy
    industry: "ops",        // 🏭 -> gears
    empire: "hq"            // 🏗️
  };

  var orig = { groups: {}, items: {} };

  function tag(key, big) {
    if (!D[key]) return "";
    return '<img class="nb-ico' + (big ? " nb-ico-lg" : "") +
           '" src="data:image/webp;base64,' + D[key] + '" alt="" draggable="false">';
  }

  function isTagged(v) { return typeof v === "string" && v.indexOf("nb-ico") >= 0; }

  function css() {
    var id = "nb-icons-css";
    var s = document.getElementById(id);
    if (!s) { s = document.createElement("style"); s.id = id; }
    s.textContent =
      ".nb-ico{width:21px;height:21px;display:inline-block;vertical-align:-4px;" +
      "image-rendering:auto;user-select:none;-webkit-user-drag:none;}" +
      ".nb-ico-lg{width:26px;height:26px;vertical-align:middle;}" +
      ".dock-btn .nb-ico{width:26px;height:26px;vertical-align:middle;}" +
      ".btn .nb-ico,.btn.small .nb-ico{width:17px;height:17px;vertical-align:-3px;margin-right:1px;}" +
      "@media(max-width:780px){.dock-btn .nb-ico{width:24px;height:24px;}}";
    /* appended last so it outranks every <link> stylesheet */
    (document.body || document.head).appendChild(s);
  }

  var count = 0;

  function apply() {
    var groups = ev("DOCK_GROUPS"), items = ev("DOCK_ITEMS");
    count = 0;
    if (groups && groups.forEach) {
      groups.forEach(function (g) {
        var key = GROUP_ICON[g.id];
        if (!key || isTagged(g.icon)) return;
        if (!(g.id in orig.groups)) orig.groups[g.id] = g.icon;
        g.icon = tag(key, true); count++;
      });
    }
    if (items && items.forEach) {
      items.forEach(function (it) {
        var key = ITEM_ICON[it.id];
        if (!key || isTagged(it.icon)) return;
        if (!(it.id in orig.items)) orig.items[it.id] = it.icon;
        it.icon = tag(key, false); count++;
      });
    }
    css();
    try { if (typeof renderDock === "function") renderDock(); } catch (e) {}
    return count;
  }

  function revert() {
    var groups = ev("DOCK_GROUPS"), items = ev("DOCK_ITEMS");
    if (groups) groups.forEach(function (g) { if (g.id in orig.groups) g.icon = orig.groups[g.id]; });
    if (items) items.forEach(function (it) { if (it.id in orig.items) it.icon = orig.items[it.id]; });
    var s = document.getElementById("nb-icons-css"); if (s) s.remove();
    try { if (typeof renderDock === "function") renderDock(); } catch (e) {}
    return true;
  }

  window.NBIcons = {
    data: D,
    apply: apply,
    revert: revert,
    uri: function (k) { return D[k] ? "data:image/webp;base64," + D[k] : null; },
    report: function () {
      var groups = ev("DOCK_GROUPS") || [], items = ev("DOCK_ITEMS") || [];
      var out = ["NBIcons v4.67 — " + Object.keys(D).length + " icons in sheet 1"];
      out.push("disabled by ?noicons=1: " + (OFF ? "YES" : "no"));
      out.push("swapped this pass: " + count);
      out.push("-- rail --");
      groups.forEach(function (g) {
        out.push("  " + g.id + " (" + g.label + "): " + (isTagged(g.icon) ? "icon " + GROUP_ICON[g.id] : "emoji"));
      });
      out.push("-- tabs --");
      items.forEach(function (it) {
        out.push("  " + it.id + ": " + (isTagged(it.icon) ? "icon " + ITEM_ICON[it.id] : "emoji"));
      });
      var msg = out.join("\n");
      try { console.log(msg); } catch (e) {}
      return msg;
    }
  };

  if (OFF) {
    try { console.log("[v4.67] icons disabled by ?noicons=1 — emoji retained."); } catch (e) {}
    return;
  }

  /* Applied more than once: 104-dock-shape and friends rebuild and reorder
     the dock after load, and a late render must not find bare emoji. */
  apply();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  }
  setTimeout(apply, 400);
  setTimeout(apply, 1500);

  try { console.log("[v4.67] icon set armed — " + count + " emoji retired. NBIcons.report() for the roll call."); } catch (e) {}
})();
