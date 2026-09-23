/* 113-icons.js — custom icon set, sheet 1.
 *
 * Retires the dock emoji in favour of a commissioned flat-vector icon
 * family, inlined as 48px WebP data URIs: no extra requests, nothing to
 * cache-bust separately. Ink recoloured to #9FBCD6 so the glyphs read on
 * the #20242c dock tiles; amber accents left alone.
 *
 * DOCK_GROUPS and DOCK_ITEMS are top-level `const`s in art-core, so they
 * are not on window: they are reached by indirect eval below. Both are
 * mutated in place, which is why this file must load after
 * 104-dock-shape.js, which reshapes them.
 *
 * Later sheets should ship as their own file and simply call
 *   NBIcons.add({ key: '<base64>' }, { group: 'key' }, { item: 'key' });
 * which merges, re-applies and re-renders. No need to touch this file.
 *
 * Escape hatch: append ?noicons=1 to the URL to restore the emoji.
 */
(function () {
  'use strict';

  var ICONS = {
    compass: "UklGRnwEAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSA8CAAABoGRtu2nb+f7/n9e2bdu2bSNOiS1gG1Ky7aRm27Zt7jHnml+wNFcLImICULcqGq0CqDZIgaGDAG2MYsGDv/9y3yRoQwwLfifJbyeINkKce5qtGFu8W10DxBl6/B0jGeN3AjNJZAAmX8hIkrF1wTgAlkIFXU5/IjCysPXg0XZQqc2AEx+QDCwMJF/fB1hNDsMfIEMWWTKGQN7aD1aLw+qv6TNWzgI/nA1Xg8OOv+lZq+eva2GVDCtaDKw58Nfp0Aoqg75hYO2BH/ZUKWd4gJ4JPW+AlTIcpmdSzw2wEiId3o9ZmhBfcVLC4TgDEwduhhWpPBmT+XgXtEAx3seYKvKXfpA8hzPomTxwC6zo8iZ4XgSXJ3iMIV3gHbAcgb3FrAlPQAraf9yEjG8aJK/dh814TYv0jSYEPg5BruIhhibcActzuIw+neelcEUnmpBxGyxPMarFmCry136QPCgejSGVj3fAUOhwiMkCN5QRafd2zNIEvmiCkoa99Gk8V8PKwHAHfQrPK2EordLvc4b6At/vrlIOigV/MNQV+NNkKKoa1v5GX4/nT0thqO6w8DP6rFoW+MF0GOp0GHIfGbJSMQTyhr4w1GvAae+T9CHLYswy70m+sR9Q1K2CLmc+HVnSP3y0HVSQ0ABMP+eGlz79+aePnrv67AkADGnF8P+OvXt1AAAxQXp1hv+LOUVjRURQMwBWUDggRgIAANAMAJ0BKjAAMAA+sUqfSickoyGx2ZwA4BYJbAC36tTQEek569E23Z3IG8j7x9dAEEV3AXYJ7vSHf1AbYxd1+rUx0hnqxZgSqbE3X9z6swimsOj+rz6bjskXKp9Jk2qgN5mViaaZ12O8XOk/uxO3TAD+8kifrMqvpBJy7+Y/eBfEKMrwapZG3ja1v+Bmzrr8CSkYxJZlRXsFKTHP0+0HuVgc7pHKZBU1YJMJaKTiGgmiE5GU7eGrTrxVJADQYNSkzbo70OWHPmpnu3xsldSIlL6ZP1CWr238yp6HqK8MbKxJj3/KCXTlFqiFys/w6JAIRFfcI/Tg4BEKadr5EZwGeAhF2zk96rbuQC18yaLesVDOMf8ACAc3n+dmE5dUc+q4Rvr2uCGjNxaGorBlqb168pGHLOizEvu/X/l9R2iEzE3i/inMzYY8KAkSxiFx+dS5Qu0DXi4f19RnOf8oRHptsiEubfzYKwSGkKEIo4h/yVKUQ+kDA9Qc9Dbt6d3gTku8SOOizQTGV7mISU+NapGhVltSvWU7dYFDrDVe5NsfIXekOX4JpMDeN6vYMjTVqoQNLMTnYHlBRsq89tp3XlyV6JOISsUgbqBvgcRvMTNbv18xxOf9VuxxB9wWfYqIrb9z+tySZLMRIfrS6f6yQUSZsTwgjABnuCf9ilZBbiRhBIyZkyC/BnwacgR9dNvGYCym23jM0hcildKLXJSNEHrCfXpn23oyn/XPA/Upx4e9Go7bqm/9gCbw9g6Ei3CKjkBOUy5XwMAAAA==",
    people: "UklGRu4EAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSFgCAAABoCzZtmnb6mPMdW3btp9t27b9PsG2WbNtv1eybdvaZ84xemHtNdc6+6kaEROA/5miIah0UEDboB0iCsxcd/35/YDQEUGw03NdpH9y5QJoByjCUSTNSP5xMLRCQtBmFFu9TktOukdyR4SSBAAQlXoBqxiNlck/HSACKDB89Y3nAwgN3MkWMxN3QQHFmCu+Je2h5QW0hqD3J+450S9GoZjxEelG+ht7QvMUo35iVuLdCNrzBbacZCK5NUKWYOBXde5FT+zByPZd/loPkTy8QMuJvBY9cadX0X0BNEsGf5SXeCe0eJtWZdwMIafA9kzMdf4+FoO+oFcl7oYib1+LNeJ0DPq8GxSLaFnGD/tgwGc5xo0RcqC4nCkn2R7A0G9yErdFkSWqz1mqirwcPTC5lRN5SA0U2JOxwpPNl57Y2Fqpwv6M1yDkQXs8ydQu8XSEgCuY/+UgkbyiGPuReynx3l69AmTypgdeHUvGZ47feWlPZAcB8BytFHkWgACMOOYpK7l/dN4SQHMCsMqZr9LZ1rvuP3oKep/9F7PvmwOtEMFa97Pu75c+Tkar8GT8bgm0jShOJj1ahqdIMjmzW3yll0op4EpaYl2PxrqJGyMACNiHXc4OjH4CCkCk9/tm7MTE2xGAgDVp7EjjqwpBgaM9doPnmv0yCooC57A7an7QRwQBt3THnz/98nP1T6+uBQUEzzI1FXnx8LEjMwMEEPT/jN5U4g3IV5SG/WQNOWO6RwrJRVnlPloz5SNRoLbK+Ceb8t8u7KFoUIC5ixc1ungCGhY0rw1BtHH8HwVWUDggcAIAAHANAJ0BKjAAMAA+uU6gS6ckIyGqqqjgFwlsALUbF8WhLLqb1uAvtkdxzvEu8cf4j/fekcnq5YGlZxgehtn/em/YF3Tn9SV+Jez6dOAU8R22jehQCn1ECUvrgsQObqO7Ysza0OipEOvy3cg/7mUNxN0Puj2AAP7+9loUym0gZ/F+XcDuCMvq1YdirN4E+f7hKqy+O1UKlH+85LM7md9A4EBqBzf0Q3/WOaRa+rDZFeGHR2Fp2k3X4It/xw4cTo3G0hzj+Ns+OobKkO1rytgA2uiHSOzOJyDJdxNncz6Nbsu1gt+cCKq290qA5N446PYT9Y4IMcNUtfURRTRlo8ATN3MQ5w7M2n9eKRsWF4sWz3BA1lfX4hAO098myd2olzWrNZo/EDMGBPHWdSRpU/WvK3Hn796r3AEZLxe/bKMXwui2sYEZwhHi2khhhhsB2+Bp4gldsbC1t4SiC8Zm8Dg+ODPEGJDpC+s5DGK2A9i4ugSCR48QS86fU+fAKHV2ok/7tmqxFuRklGvX6XHBkym8v6U2Ifosrpy2foINFiFNGsdX54HAp7EeRIa9zBy7nr98066u0uF1MuC0faIQkroq5Xcjt8AZiMZqVX5sawDjm4fIHe1zh6QWvZjRUnR8IXrN0iP05ZL7X/ttwPv2YhExzVZI1PigBruAuViOlfdppAnwxJcOgFlRdNruBtj0mCqdf7BT7JiPntWFbvLhelFDpylR+Nz3EAVRia5wCJonu9IxX2MKC3x+2DGJ6SvBibZjMPQXI98BLcBJeqhJcC0cvMzzt6f+aOg2rc6aF/3n09XYQ8DoeB2kgiA/4p+9heAAAA==",
    box: "UklGRtADAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSKQBAAABkEPbtqk9+9zzx7Zt265s226d1H86p/rT2UZn26ls2/mSd+/dxaf3XpsmIiYAYRuDWKsB1MRHBahTFVCNhSiAbjsTX/OaA6KRSQ4gg44yOdjVA4BKFCYHKDL5Mumt95bk8aEGyJGwjAJl598jnWWyt568PqMIoCYMo0DN5a9J65ihdeTDhRUBNdmoAZrmfSOtY5bOku9X1geMZqIAumz7RwaeITpL/trQBhBNB/Q+QtJ6huwD0u3rBUgKkdEXSG89I/SW5Mn+EACKkaSzjNpbR7aHAXKw1CUYy79+MnKS5jOIh+W4VAviM/5/jfk+Lj7NMiZ8HHyCE5IUvUlaH5UPyM91xAAQdNlrycBH4Sz5Na8eBMkCtFr/nQxcWM6Sb3NrAoLUxgC1VrwjrQvDWfLhovKAGmRoFKi45AlpXTbWkTdnFwVyDLI0ChSfd5d0NgNvPXluRD5ABSFKDpB/9DmS1if5gOTh3gBUELIogN6HSAbeWzKxrRMgKohQVID2WxIk+W1dE8AoIlcDNF77/nluDUANYmkUKF0UUIPYGgXUINYiCBtWUDggBgIAALANAJ0BKjAAMAA+uUygTScjoqIqtVwA4BcJbACxH1AQl4Kd1vPxkdtb5gPOH/oH6q+2j6gH/A3wDpVv3D9KNPOywNMGzBur/QAPE+dTUmPfAHD8GvOhhpZ6ckP0aD5Ac0b7+nov0inNupnclflL3JS/B5UbQgAA/v2cF/Y+CNwv3jyerb7f+uJGsVR9H0P9k/gZCln0NeI0HvZB4Brkc4DmmJsVSW42xowfrJjXUC+BTMr+s/bVBgXn9EE2ahgeT37v6KtNkkG5ZWu+t15gwWS/x6AnteSm8Z3Q+sM3pGbgy39iCoIC2z4w+IL8xYk86D7/dr+7K4nP07gumFesR9Nk35ud70rt0/Jo/QrSi3yIWGL2ydDZGsr41+J/ZZwi32t7Cgo39mvHorPewoSNL6LPTN6eJsfos9weoVdIqLH/zu5P8x+2AuHMXulqpE0br0T7hC+ZQb5KYBvP2J1Oxdl1dXXdlLbFJDsM/XljU94N0nf7IQuiH/Fvfpi4BkFZTsFhS1dDyLEIXE9h2RTWrYQ6Cvd7yN5HMolU5nhHHKp4SQJDmwCdeB4bfUeiatimzD3kTQemxlcrJwYkvGsRzs27i5upB/zel/mcwNAv3JbY3Q7Ib2duoudN4wAvSmIfKperfbsXf0+Z9V48vDQpxwzV7R23AZ8f+fUB7HEMcwlZLn/EAAAA",
    crane: "UklGRp4FAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSF0DAAABoLZt2xlJHtL9vM9baMysbdu2jcLatm2zsbZt2zbGtq1yNZLcHyqVpCoiJgChBc0tBkaliRRYGYCqNIcoWp9e8vWZywCwpgkUOHAWyd7KOwcaQKxpjFjEH+Pbc73pa5/9F+c+sjUAoxKdArtNWnTgSr0uDwfWv2UCR161GgBViUQs9F6+vxzO4i2lj00MwI7PLna+P6EdgDXhFNhpbP44qD7HZT/rWdrErADJzBd9xdf3BSBWghnE7+K7ywLA5Kk4jcejVgAse+4/3ox7tgRgJIBg53/d0xFvX+GJQSz9Pc6b9+lOiWQ8nmhtV2CL+yp9P5y3OiB1FOc7LI6aNWvaQtbvm55bsiS3aMaMWbPmTOglmXtrANTP4Gf20tdxScel55D/DxryzyiSHDTsv99/7yN/HgBT5wvPoeu6rsf6jnsygM94WjdvAPAErz2bg1aC+n1Jh2E9t7K7+bq0D3AXb7XP8SLg2P6hK0F8vnZ6nVovAD3O/41v7Xds5rDp/I/DDjz6uAO+46A1RQDFJ4zSY6TPwAKCtbPpbDZ7dOozOvUcfnj40ZlUKpXKHHXEQ/OPPL14cSqbXhuCwPewv14/b0fA7ES051ZDQKO1CX0w2P2aUN+4njpZ18hvpjEVP3+LrkBuJyx8VU6dbNfIbwaDkBaPer2k29/v0unh5QGQmYi23GrhFCnSY91/lxHxEbPch6XHX+zriIeC4NChnvtF58O/eW+fMwACX4PtWVteChIGFs+Qfw3AFdwOIvAX0SH9PVX3FShCq77udnDi8hdzP2tR3+IqktwjErzKAcfxjye4LzSAoO3qOVNOhSCaDXEWyf0DQYDJnyCGiNYxOKknhMhygwqnKBqwfSmExb3FtWDbo9oQu1cZ6v0hwCP3wUaz1LblWR9y30CKQ/n8Q86uMFG85p22qLTxudw7EARnTRp7BAyieIUs7YabwkAAQBDJS5y+Hcy1oaAQRTQvctjSIhFErniZHLkqbmyi19wHOXLAhU30Kgecwp8e5b5NoTZhX+MmuJLkQTZhtWG1z3EZ4OwKd0TjxZzZ3dExkk93dN8xm291dHQeAWmEYgfWeqz1SLK8HKQhB9NhYI/u2jANMNhoei6XD7okP6hNpAEA2lZcIfiKLWiwoOklfFQAVlA4IBoCAABwCgCdASowADAAPrlMn0qnJCKhsdZqAOAXCWwAsSVBVnW8vmtuRzxGmd7x2jVJxMqYbaHxBYi//iti8z7pwPR85W0esTvEXdmi8HettDJKmkl/cAedWmbYIPyoAAD9Er6Dh94t+OEkoStXly67HOFZ1MM40iNI4/hERdWCkrWa7YozD1vP1W+9yOGlVubA1szcgKkjrbYmMzP0PjBPrVJTexS4tf2k48St1z+LAs0stCspg9jbgyCwlfcS5Vly2b5I7snA4hM0g+31BijA6rgV/gRrfSWfirXLu21GJrsL/yu9NzsrrBMtIn1CT9ioPAZnIje1q1Jve9WBBhU/CqGyRh/nIJIWPn3nkaiZn1KmGfDskSZVFIi1EK1JweXpWKUl6l9Mzhg30T8C/1zT9JTqu1/2WDDta1lHQwRRPBUVZgmpEqg1GlxjU7AfiBYwv+39fsfQ8gkYf9fgkkf03OcN0SxpxW3PW/eJkhgoTh3ScQdrV8sT+nUWe7o9oZNRylmh+rOxceVROi1NBjLdQIDdzbbP1GGSQ7GxoGoe8/BlGDWH/kEH6l47t855N5W3o9KYkKCGejUjbarUbbpoBfOAWKntD1r9r/+bQPfpMixF282Zq/iQAEX03bx7ftwwmIYww3IrsyUNrhvyBbwWzdJsUuGVZng98HnxCyU/M3qZgNa5MvkCAbSabfhM4v/faYronInyiyyAoUAA",
    house: "UklGRsQDAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSJwBAAABkGttmyIp3/9XLe7uEg+hcwmWubu7M5BzBw6xp0Tu7u7kuxFuVdVf0D0zVY1nETEB+F1bK6USASAlEsGspYCWRkV2kcfawADQnEgSRauj/PGDp7rBoIwGXU/SkY53B6AVdjy49+DBreHQaBb9b9ORpOPLCvQR86tgY1lUXtCx0LF5LG6EH+G7XxzNYmwLHWt6fp5wgZ6OS2JZTPxAzzoDs89kPLGY4xlYd8Z8LDHYxCywwSyBKHbSZ4waR4GDdBljLdWGFK2P0zG243y0asCg61k6Rg/Z7YGwdVkMuEvHhIFvh8HWYVF5S8ekns1jYWtYjGqhY2LPz+NhCxTjPtEzeaCfBwWgmO4ZWMKQcS0Ugh7fsxBCuiyEwAFQ0TZn+Z2l/M4b7VUg6HmHl64ypAl8eJZvBkEBKHquaH2QLo3niaYVQ6HIC4Cj6c4BEBRLazmc7oy0UtQ2KAMU/xGslEFMHWpwKN1piNaC0aPpzpkmFBtMun/vnfvhEn968HgRTM5iH0t6HDYn6LK6Wt2evFpd1xuS+xnFllRq/doBVlA4IAICAADQCwCdASowADAAPrVGnEonI6KhsdzKAOAWiWwAuzMctb9THr8BnbgeYDzbtNa9ADpRP81ggH8lY/P83SBM8aAAzKw5B+iFbznGMN+FvQtZHckUt8tfR0I98Gkt419gUwfjjJ31+nTyAP7K63/mlW3vOVcwI9Hv71e1r9nYU1r686HUp4n3ZKM6sPPe+7kHymgvp7D7hTdIhqDEEk+HqnhLJLyMNCWvMMSpBattE8qSf4PWLhMjZC06yGPFuBMif3Bj70sp75gT6MxRZoxUy1Y1786TFsSOJxLTSp06Au23JbdsyiOZ4xm770O5tSUI5atlq95kq+Wl+gYKzZNK/Ah1H/YmQIwjmIIsnaZ8G9GwkbvyTSCLuFMMZqZleVkgkZJgOXeOgzjYqJYGjPKsI0Vt/8F5xhQXPDK4bc7ufeZXX7G6n8hPZPryRLs23d0vQOp3l2FNwu76s6U4uHk2Ffi7wFLJ90yMiHt+1pRBWJGdq0A4pMxfxG72AuV1zdHBQIV64RetPb7uiNZm7R6ii+9HC9OyTnG5bVfJS6naaUhyZuvBrxSIZ4OZcPgoD7dqb+TfbMpH8vkxhqpaP5XQPiy99vInAprim0lNiSZ5gSR7Y543HRFmkNm4VQsdzXZWgnXoT9IXUL4c82BHZLOYT9outB1YnC8/u4NrYD30DatkAAAA",
    robot: "UklGRhAEAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSN4BAAABkGxtmyFJ3/9nVI9t27Zt4wLMle1aje0b8Cxby7GxNJc2qyIz/kFWZEWcM/uImADkmxleMwAijwho0xIgbxgtL+lMSV2wJ0QV7osxciXlS4ApkjVGywAEfijMNFmRUCb4wmiSERPJh5pEfoAx43sUfZoOhq8BRsqPHmB4y9xCPlVnckSByl2gOsvnRiqlcgeUB4Z9PflUBvaciIEhK9Obt8SmNx2SzO5NW+I3p5cOBDgBo9cNcXqlPdiK0eubRNpaRFtH8qolsQWxuidZcZqRUtgEGC2hOI6kMziXQtpoV1rmQNkcFQ82WFCZ4LgP6aBMDgAHfViLeKKy24tfinFl5FHxRkUAFDaJt4uggADnwl/Gh+hXeCDuhGjxUsuuuJP+7P5fnPBnV9xZ/cv4EP0K9/+jsE28XfwPUeUDJS/FuDLysHhrGSLEHxTtSsta5KYyfNyHNJehOCgc8WEtFCw2Gw/m2QQYI6GrULqBc4HVXcm6yUgJGDbo+kVMqHWYj1Dr0MizRmQFRtfz4tIUNgXDnoE+cxbOS0dJjPxcOW/hrM4AIykTADTUJjLWkflYBgCIkcdAFai2kvxbTZVSjHwz7Xz/+av15zerwHBbs369+pb16leDa0ZidgXihITEVlA4IAwCAABQDACdASowADAAPrVGm0onI6IhsdzKAOAWiWwAuzNQUBZs/ZeBPLFC922/PSeiXyQOtE9ADpTP3L9GYwHzOegAMysIMcd/dgdLUutLpKVAp43ZjnKFLmy6mRaCELVIDeOC9n72wsG8T9UTQAD+/xpXf+ODuV9rQKnQxEeLSt/nq1b4p7rR6rUURYRwTAZjTd8Hd4OfIvaqLmqmxbMyNy/2juKHVIfjHB+6878MHn5B0fwLFSoKI1/5IWtkKIBAK5mRhUcyj4EPHdmh98zrxkmNIyruav//W7ZgND0Z5f19e+xEd2MNzNutQqaI3+4logcN2KIB3D5oKQ4YoPSd/1li+cOtFuUoKZxJ+ZPKPwq6+koGDHXY+aOojSFIoRUopn/4897ZAtZ94cQd1hsxyiZ+hEwb6TuBZ15pXg1QUJtrL/Tz/sN63xE/3YKMy2nv32GHfdCv35EqrkelfvnClGWAr1AxOgoyrEgJXrr0M5vKkPjFmxm4T8UKHu8hu+fZsAF6wRQYWPCcoesY6LwICUTRSPBF0vwgiH3wtxS7dlnCUgBtSwYU0xLkAK+Y1zFtSN0VOBUfKqmg21BFEvEM/fU4qMghcmbzEZTbohfUqvjfw4W3XbuoGJz3uVZ+aOYP2gdsMp2vZtto+1H5l9VetN0wSjytieFQsMUwTgdJc5pfeTq+WD07YiloeFiAAA==",
    save: "UklGRpoCAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSMUAAAABgCPZtmpln3s+9jzDmQH1p4e7xKSeMSWPvv8Id+59bieDKCImAGlStRMKE0MgFwLs6Zl6p2dcUB6Re9x+eqn5qbsDpiyFy1DkIRqUUlj4/tWmdv0d7qFBGc1QpPkJ98CUWpQRhj/hHlhU+BMugUVpPbRBkkz4MAklSYctGySr/e+pZUkbBtL6nrSWJa3rSOvY0tp/BE1JTmrm4/fXaIHm57c1CoLCRSh2HQwQWUf3bZFXy1DIHnUsu3bLYeQSQyjnACQUaQBWUDggrgEAALAJAJ0BKjAAMAA+pUSXSiYkIiG42SwAwBSJbACdM1nQokx/mZWdl70AbenndbJnK+t3blzZ06JPcvhZtAnNp7Y3dAi5PH64RtHRaz83tccwK13cJco4AP7uJD+V93f6HmDLbmXTRRbOQVwY+66EOLRVDQjhbUbpeHVCS6z74xvwhpenHnO0XpSgPfiWvqUZDg+KRgtkBy5MFldBejIT/i2k7JEq3nvsGb4z17LieAE1O/Q3fSRgHcDUkJZkgYD9eRUhzIQqxuhvI/bf6oR+MBUk5Gc+CnM/4o7Mp/meL/dGACcbqgrb1yKqJRyseYskxfWf9KuH9udyKxfE7NdJF305PazLYEKr+u+nZcmbK74L/z+B/iht6yZ8PAEF8ZycpgXadavIlyptwUW5nfNYSTq49XnLRLz7OO3NW7MiSr4BNwBQhAPGYkNDoqMrzNytoZqBeUG5JhwH1Hh8sOYzNbB8sc06QHOgV486jeE+YovLiSBk4TqBhqr9bex87sLOpnv28UnxBbF9V/hH37N6dRl8UQaNjjUDtnMn/PV8kEz6pRweaUgIypN8N3SAAAA=",
    bank: "UklGRiQEAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSMkBAAABkIPtn2E7v//M3ntj27ZtO6Urp3Iq1+5uHzvp7KSzKtu2k7Mz/1+w59yzU6WMiAlAvkUQtFjASkARULUcYEOxgqpr3zxaWgbGhGAsZNZjkrw6AbCSlkTA4NNkrBqTB7sAkaRigSabSKck6T0zxbUAmz9jUHbpB6pnVke+mBvBmvxIBEy4TjrmqjF5cTQQSR4s0Pkw6ZQlVEfuaQ3YkligRnGG3jOP3vPLikoQm4uxiGY/Jx3z7Mh7UwBrslhg2AUyVuZdY/JUf8AmCJptI50yVe/IdQ0hAAzmfqZ6pu6U7yfDQFDPM8MgM3xfEWLQ3quGofq5Nsw/cRxGHP8jqO8Y7LtKEBiM277XhfB9z9bhMEis8pOaluorZI+isrfp03I8X1Bgk2Ax1qel/nMPWGQ1qJuhpuN5C5BcmgZwpyC3xiHY/ytNArgb5VYvgJvIxaKP05RU3zaGySKm9BV6pux4NLJZDCr9pKalfAVIgthSy2NNjfptYaFNiLCMjgF6TkUEQFD7UhyEi49VE4FI+Wv0DNLxXKGIQVuqhqH+e20Yg3axdz7QDwlNGe7PajAwsvbRw8dBPnqwCAb/li4TZtlSSDYI1iRBggUAAFZQOCA0AgAAUAsAnQEqMAAwAD65TqFMpyQjIiq1XADgFwlmALjhrtj1pfWDnitNg3leutj2ZidZ3mY62kOedscfi59Va8DDGez3tWLuqVEov+fx+6WQvfdgQ9JqrvZFX7blcdIbb3ObTnaAAP79U/fyssKq7091807rnbuSW+8VyZaKscL53i06Iv8gKuNJAwigmZyfEAgqVcYRg26hSTIXKFfUfedrY1ZfjMUXSUWWAbaKkaqih4Qveln6GtR0v1NtvMi86OsyLP3Uujb3yx5IiP+TLzfZBpekNHkxfrhwAG+3/7/SdDwuhxP/Ie/5DGSZBDFuXO7rhpSDj7vHn0J+G8XoM9LTgiONe4CiCF9E4I5oONlX9kvAZmTZiY89XGtb+ZawdHh4qBjHsfCH/We4gGsvU8MP1NgQWSPwupfQwUWkpM4pwI2hkWz25DyFd4f5LyvBsUGag9tgDw3klBEDsn5Ufc3HcJnGc8aRgoZFuQ/x/kAi6ssrlNOpwDH3qwgfEKjG6gXvIvDzQIxQIljY7vEfyd/piUAVdHpcGyRK0vp8o1mMFKFGd58M4fjOuADb9nuv39HDnQdbdmUNODo/M+qojkFPxPZwjq1mn9qlgh1YSExtIYDLjqyJ9MuZUvbn6xMfzjAMOPQmzcKVIFIyCsYI1g11aPJVAAJW0kca8cVW8XmubqkYx2gmekf8ehqQRb1rDyJlP4YEYC3ZxprVwwr2wtihilYVs9unzsXOtmVWZzWx+klqAAAA",
    chart: "UklGRkYDAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSD8BAAABCsnWthmS9Edk28vuMe/EWNk2dzYuwPbMNXhmadvY2XZik1FTHePd9/0REROA36GF8ay5GeUbh9H15zoLi2fkR4nGL9kyKSmakTa9e/ZS7d2lDCav6UWyvHjWdHia5e8S63iVNUOEgfyaAPiO+1aMF33TmCQTXvOlX+a48VvTkKv+FOiJkW6TJkwkOCDyQ9GXzpniRcDi9PN3VQ3xHl/mUklSuc2Xea7tfzMm5EfeoEBPooZFa1at5kodZzzBZjq7iydH9IuqakjG+rKfMUkGjvDlgGvkf6kVlgddoyznu3ZYDiigxIacxpfZQsFe12BglmuzoI/ruuRatHob3znAp0kMAAFXyfvJdwAIeHCAF5IYAALe8+A0A7HokPn7rVqMGLvkzEnV03SeUgWdUA10nzg6xVj5KSPjqRjN+8UDAFZQOCDgAQAA0AsAnQEqMAAwAD65TqVMpyQjoiq1WqjgFwlsAKtJ7zqLp+0E5c5wHlh9CLmpP2A1mv9XfYU/VXrVEaDbTYME4yaLIantUVisrybCn+QrcvkyFFC3yx8w+1w5bDPOQur+3Z/c35pwYAD+7dgPOTwSjrgnd69f5//+kE3QNr6Tm9zIxaskkL3wHC+m3kuxbFEZVTf7zKen1jcwQMK/9khVkOvTRLOmTWDr141HtFUMBEx40QnhISdhsa4V8qh35CeyGapxUbHaaZM/hfzwqkmuYzYoXC75JbC9mqVPc9qfixXjDxxIexjWInGs+hvAAc15c0WkytkcmpzrOdXvMGP12RRffOv/3xYbSKZvo7sKk9UV1ySy+eeTmPfw/DGqP9vtWgScs5d034Xzbs63SgpzOd88grmar6e6F7ZtD7ekg61MjKjjbvb32wye6ecq0u8pKX8LJEubkgK4H23rAb1QFzSMP2DfjX4g4krHMP0PnykS/kq5ZyhmfcqeHYmR/jXl/gD/yWS8X+5jx3/EiJCBbrR+o4Kr4cbrKQqcIiGtjJ7Fd8wXAfGDmFKdS/v97izj6UonM7gogD25GZhBxNlxBblZ2AAdNeaQmi/y9d0tnf9f+NkEIAgeXNKsglocJ0AA",
    bag: "UklGRm4EAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSDsCAAABoHZtmyFJVv+8ETG2bdu2bds2P9m2XRjP2rZt27YTz6IytyIiYgKQVREBRARuihYAWgMQIw4oAPmL5QJyFMwHQFlTyDXr/q9/fj99+u3vvn5kaUFoSwr1nyZ/+o4kf/qRfKMtlBUlVT7nHb2L3syPPuDdRTtd5U8toazgLu4BRvKDyuXf5FRgFV/NI5I9jc58ViHny+wBtPQ/yCe4g6NhsmewN5wMqcsXoAzuZltI9/ASdPYU7mYzQV+eEm1kfTgJqMwXALFwH1sCk7gDxmApJ//nlSwpo7XOYR5gA2OmcrfJlcus4FRjqvEVrY3WRv6HIPPdLAuM5CYAmMuRQDG+iGwKWh1KJZOpxOe8LZl4hK8l0unE03wkkbyW3yeTqWRqW3lIDEGVX2n9CRPHYDj/8D3P80L6nhcw8DzPCxh4ns/Q8zzvL+/3MlBxpoQ+7Yb0asVbSs8SyZbxNtnz2RM6ziEXRsNEaVyw53FOHIU76dtbHUfwiAt74kBeYWAvAR0hyPsxQ1s+b45V7BsXHoFEKFT+w17AVwQxGtB+yI/yQjJptGPowLfFowwG0nfgr2pQUeMcINk4zgJ69gJ2ho7a4ILPoTBRe92YGqWRdsHjyji30Hdha5TCA24cg84EeYmBC9dGCHJ+4ILPe6EiCn/B0F7A5wQR5X9x470ckP8o1A5cCPlFkaia9IPQeuD/WDyTqFzP08kboZBRod4jv/76m+Vff7mlpERAgIqVbFcuDwiiFVwUQVxRDiIzAFZQOCAMAgAAUAoAnQEqMAAwAD65UKBLpySjIactsOAXCWwAs7N/k9YZ8BOW6496Tdt3zt+mk+hB0oSN3SQavpMAO6vtTtrP7uSf847py0uyGlm8IXG3Yj2WSo7dElNU7HHkAAD+/ZwX9S/HdVsxR7fIX39+QSGVSZus2CcfKJlGwueYI8Vp6n+z/lgUjtAVSUMuLonDCNwdbyCEP16iMrwgoa+chVnC6SM/eiK6Ox4JSRIity+l1kj41v+9jfiSfZXAcEQS8cFIQ6umFeaqKj3I/iDhRxioeb3XAXP64Qg/6FNuZfI0DT8LUdjfNR47jMSO+LPutvet6jG/209izQYD1skynkDLb6bbpdetEYPRfXeQBSD/puck2g+03kGUkrAbYFmOtcVsFMGLqfNCVokWLGYLbn3Konbw1PcI2EA0LiTbUPgvfN6gS+Tsvw0pmTjAff/5/5dc92uN5nSrx3pTWfxjsqImG9mTMeImk68cuSarPLks55uo9iwTneexf8VGZys8lduOPHsEJipsr2xgH2pDVJGwnDNwRChiA484bPpD+O7vOxdfGa6op9QVT02yYxzSln/CJaKAqhn2s9l/e9uf+heQVvmDEfEb0XPoc0/xhr/h/9af6wuZRIn4emyGawpFpo4b/dukqiJcygKRCkLV/D8Ol9l4byUpdlX1Ha/KI8sPQaNVrLnHbX/PcPgYsAA=",
    factory: "UklGRiwEAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSOABAAABkIPtnyFJv6rq2bNt27ataKOzbV/qiy6ybdsMfaFt211Vv6Cre3DOImIC8NtUMigc0p2kVJeYcuLosWMHKkJCosXRo8ePHu8OmTiBDC8ZnAYPHtYzeD45eV5oX3/Tc+FBYZv+pn/oK0IkTqLYJ1r6XAYPEqepaXg3I0QSKlqSmtuhBHCFhpavcydBoSFt4CSkQOy240sJyCS0oQlcFEIg53NaWppqUAnzkE5NGt6MQaLwe1rSsmlSBtMnLZ9nh0JZHTDslpSJro9F4KEuLUmfveElYVaANJURQ2sax9ikLHRYNkAGL53aMR1pXhSloq1xGHaRHnrRd8xXiCgUIivsoyap2Rf5BsyndqxHlZEZIQISaN0DIkzgrMPn8HpX6dY83PstW0EB8JA2m19zQYQAFx2W977Rtw7SkH57KEiB2ufIF/nCBNRNGroNIxrNdlAeMO0rf9jXeaNke0zrsJaRDduJGCqdJLVlFIl8b0PiNewMDHtH3zIOUeZ7wurl30tqMg6FMkywtSvuUVvGI+DNo0lMUNMZRYjsZ2mYaG0Yn0I9aiY/Wn1jU43/uVTDVCmgHBJVUuRVBgSEN/7wDz8lP+0YJAQkijB1v2eGgJBjNm7YlJIb1vcSEj+lSmHXLx5WUDggJgIAANALAJ0BKjAAMAA+tUKcSicjoqGx2Z344BaJYgC4Y+2GB+e+Ntued60y/eP1++NrQhm5hMrNcFy0P3GarIejekT3SGdw8oEPIThzdJk4jyRgJeId1+IZQ+0WskUplZVUba2F8eplZgAA/up7B6zGfZbUQ8m2nVIGy3ec9kaQ2MyEDzvDdsLaA7q7S/17dXNrdjeCC4F4Zh1FsgKTZSZd5jjYLSx+9gtdGD2wmFbnyrQz4rSW7Sn/EPXI9QLFZ+f56yOXYWirgQVD3VcwqNhkbREnP1qtvJWykoSMaEdstDkfgEf/9+c//vw///3zZ/DNPzNVwk/+wgdMVqQ3S6pthr+6Zx1tQr0IiKYzuoC8VUad8bRCYIOis4hWTcNlR/ZHHo966y08rhWBKWaqG7RR+un3yi/Y/4tA+rTIucD4KW7iq8iMQvgj3jFsD7npzpMj0CILUIAN46PufjdMCP67kTS3w7+ZEJHKV3kSSTZPg9hvE7mycbgfDbuSzDWQwA/Rq2BiePBO4BHAUtFJyIDjL89YvEUfm6e50m5PzKBlN2AY3Au5aTGbkoyAbU0T6LfDYegAuFWrH3f5/S/MIMhsG8ck3bs2xbj9JnoxjvkjGpY2snICi8b4izdrFq5xXnOzfsKiWmjblby1xEWqgaTbHjB72FRuzMe9IVvoEQkq2CFXN1DG1xjGlzdJ+NvSi7LmDIJnH9bLk2iFSUD52cxWeVXAupwAAAA=",
    handshake: "UklGRmYEAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSAMCAAABoEPbtmlbmmvt823btm3bdmRktiP/sl0VWWFFropsMzTvP2vtGVycc2/0w4iYANzCVs1NguYiQNB8AgDJQTBwFBAkmyqwaDAkk2r33+PDQ5FdgLlv8NcuqlkCHmHKwt0dREpokiRJUEWfZ8kC70PIEDDCLJrz5aRuEkISULbBFzSPfnOQaJZXaGRqd6J05+13333/gdldFK+akcbnESoKmEEnGfnR1f3rVq/dcf03Fv/z8YsfM5J0TkWoRPUtGjOmaZo6yxvfgFaQYA2NJT1NzSxNI4ujWyxB4yqEMqL1Po1eKn+Ln9ZTKRWwi8aqG/cglBBt9nP06nn8pblKUcBJGmvQeBoBgKL9bx5rIfofnaFAwG401qTxHgQoWpunZPTqOMk0/t8MIlr3QdKM9Go4oxt5KSiK579FxvcY84v8nuRrM1BaIdveOlrvdVpezvdan393I6ClEFDc/vcY84nxv74oDygvQerK+debs9lfqSEDGBE95Ia//uQ0JMgdsY9+RP7YWyQbBvq8s5hELTw+AIs8Em/m/Z4oF/wQQ5KpJ22/JmIXkXq2DnAXdL37Kglfgbv/evxyC3AUY+h/pjO5OOsnHAEEVpQ4mXHubN0nSyI+/eaplnTqorgDdv2M8sPpb8rakHmpQ66Dl6lFA49mjAahUDxAAGgCICGpTggISFLfGAQBWUDggPAIAADANAJ0BKjAAMAA+uVKgSyckoyGuOAmY4BcJbAC+AxvS/2O6uGj22fPXegDeFN4y/w+AS/gB2zZFYstrLN7plRRTAVZoHX8f8NiM8VF5+hgo3Ayqu3o7iiesoTTn9iZaC3FOf+p08N2+ibipo79Cbb5gAAD+uIr3bP+Cpk0y2UpI78ooN92y6yZuqai04LdXa6tf1aKIz+ldFhau8LKzODHu7ifiqg+8EbCm0Xy9V5LSt32N36RruK8MZnadfCmk+R8BcYKZkSqLHQgs+M8QWl/flzcodUqLhlNg5SB+nz/vyC3Z9bT65Qv4R2zs4ozyukSVNHBPx/2QfWnK+cLlzpdNSjkBEUzt1qSpUHDBq3cJTP5DTlCIpZLWjZiWdIqbPwIKxX+b8SbJ6yCurEMrXt/dmXERAMv0fy27mwxN179BEcDZ/UIl8IsQJXtemd6NzkojfN1MgTENPYe0IRDwYAgbjCx5K3rxB2Mj2pWwe2IRDl8es/GNaDKAJSaB7ZlHaUEklC7EN0xCDOfu2y2pKeRCQ/Gd3G7fbuTwOYD/N8O12epoXuuyy222/MNBUHToPWO+oTuKaS5Z8ZtTGpYeO+JhC8TsxOq1xqrUV7xxFHIH8K01aA9SYDrWBmc5m6t1Plui+XjD1q3z0FigACEmB9Y7Ghea6lWMhkKRnraKSb8VavJfYhy8UajBNMeCNzek9uNlUOlT/O6a60nO55pTAHoX/7kziKNH8d9//B1its381NbTHQNtkH3AAAAA"
  };

  /* Rail buttons: one icon each, all seven covered. */
  var GROUP_ICON = {
    run: 'compass', people: 'people', market: 'box',
    empire: 'crane', life: 'house', jarvis: 'robot', system: 'save'
  };

  /* Sub-tabs. Anything absent keeps its emoji until the next sheet lands
     (hr, slack, zoom, research, invest, life, milestones, orgchart). */
  var ITEM_ICON = {
    bank: 'bank', decisions: 'compass', team: 'people', clients: 'handshake',
    product: 'box', financials: 'chart', personal: 'house', market: 'bag',
    assistant: 'robot', saves: 'save', industry: 'factory', empire: 'crane'
  };

  function uri(key) {
    return ICONS[key] ? 'data:image/webp;base64,' + ICONS[key] : '';
  }

  function tag(key, big) {
    var u = uri(key);
    if (!u) return '';
    return '<img class="nb-ico' + (big ? ' nb-ico-lg' : '') +
           '" data-nb-ico="' + key + '" src="' + u + '" alt="" />';
  }

  function isTagged(s) {
    return typeof s === 'string' && s.indexOf('data-nb-ico=') !== -1;
  }

  /* Top-level const/let never land on window; indirect eval sees the
     scope they do live in. */
  function ev(name) {
    try {
      return (0, eval)('typeof ' + name + " !== 'undefined' ? " + name + ' : null');
    } catch (e) { return null; }
  }

  var orig = { groups: {}, items: {} };

  function apply() {
    var groups = ev('DOCK_GROUPS'), items = ev('DOCK_ITEMS'), n = 0;

    if (groups) {
      Object.keys(groups).forEach(function (k) {
        var g = groups[k], key = GROUP_ICON[k];
        if (!g || !key || !ICONS[key] || isTagged(g.icon)) return;
        if (!(k in orig.groups)) orig.groups[k] = g.icon;
        g.icon = tag(key, true);
        n++;
      });
    }

    if (items) {
      Object.keys(items).forEach(function (k) {
        var it = items[k], key = ITEM_ICON[k];
        if (!it || !key || !ICONS[key] || isTagged(it.icon)) return;
        if (!(k in orig.items)) orig.items[k] = it.icon;
        it.icon = tag(key, false);
        n++;
      });
    }

    return n;
  }

  function revert() {
    var groups = ev('DOCK_GROUPS'), items = ev('DOCK_ITEMS');
    if (groups) Object.keys(orig.groups).forEach(function (k) {
      if (groups[k]) groups[k].icon = orig.groups[k];
    });
    if (items) Object.keys(orig.items).forEach(function (k) {
      if (items[k]) items[k].icon = orig.items[k];
    });
    try { if (typeof window.renderAll === 'function') window.renderAll(); } catch (e) {}
  }

  /* A runtime <style> outranks every stylesheet link, which is the only
     dependable way to size these inside markup we do not own. */
  function css() {
    if (document.getElementById('nb-icons-css')) return;
    var s = document.createElement('style');
    s.id = 'nb-icons-css';
    s.textContent =
      '.nb-ico{width:21px;height:21px;vertical-align:-4px;display:inline-block;' +
      'image-rendering:auto;flex:0 0 auto}' +
      '.nb-ico-lg,.dock-btn .nb-ico{width:26px;height:26px;vertical-align:-6px}' +
      'button .nb-ico{width:17px;height:17px;vertical-align:-3px}' +
      '@media (max-width:780px){.dock-btn .nb-ico{width:24px;height:24px}}';
    (document.body || document.documentElement).appendChild(s);
  }

  function run() {
    css();
    var n = apply();
    try { if (typeof window.renderDock === 'function') window.renderDock(); } catch (e) {}
    return n;
  }

  if (/[?&]noicons=1/.test(location.search)) {
    try { console.log('[icons] disabled by ?noicons=1'); } catch (e) {}
    return;
  }

  run();
  document.addEventListener('DOMContentLoaded', run);
  setTimeout(run, 400);
  setTimeout(run, 1500);

  window.NBIcons = {
    data: ICONS,
    groupMap: GROUP_ICON,
    itemMap: ITEM_ICON,
    apply: run,
    revert: revert,
    uri: uri,
    tag: tag,
    /* Later sheets: merge payload and mappings, then re-apply. */
    add: function (more, groupMap, itemMap) {
      if (more) Object.keys(more).forEach(function (k) { ICONS[k] = more[k]; });
      if (groupMap) Object.keys(groupMap).forEach(function (k) { GROUP_ICON[k] = groupMap[k]; });
      if (itemMap) Object.keys(itemMap).forEach(function (k) { ITEM_ICON[k] = itemMap[k]; });
      return run();
    },
    report: function () {
      return { icons: Object.keys(ICONS).length,
               groups: Object.keys(orig.groups), items: Object.keys(orig.items) };
    }
  };
})();
