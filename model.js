// Ivan's Workshop

var FEATURES = ["simple", "cute", "active", "pure", "cool"];
var ACCRATIO = [1, 1, 1, 1, 0.95, 0.9, 0.825, 0.75, 0.7, 0.65, 0.6, 0.55, 0.51, 0.47, 0.45, 0.425, 0.4];


// parses a csv row into object
// Clothes: name, type, id, stars, gorgeous, simple, elegant, active, mature, cute, sexy, pure, cool, warm，extra
//          0     1     2   3      4         5       6        7       8       9     10    11    12    13    14
Clothes = function(csv, real) {
  var theType = typeInfo[csv[1]];
  if (!theType) {
    alert("not found: " + csv[1]);
  }
  return {
    own: false,
    name: csv[0],
    type: theType,
    id: csv[2],
    stars: csv[3],
    simple: realRating(csv[5], csv[4], real ? real[5] : null, real ? real[4] : null, theType),
    cute: realRating(csv[9], csv[8], real ? real[9] : null, real ? real[8] : null, theType),
    active: realRating(csv[7], csv[6], real ? real[7] : null, real ? real[6] : null, theType),
    pure: realRating(csv[11], csv[10], real ? real[11] : null, real ? real[10] : null, theType),
    cool: realRating(csv[12], csv[13], real ? real[12] : null, real ? real[13] : null, theType),
    tags: csv[14].split(','),
    source: Source(csv[15]),
    suit: csv[16],
    deps: {},
    toCsv: function() {
      name = this.name;
      type = this.type;
      id = this.id;
      stars = this.stars;
      simple = this.simple;
      cute = this.cute;
      active = this.active;
      pure = this.pure;
      cool = this.cool;
      extra = this.tags.join(',');
      source = this.source.rawSource;
      return [type.type, id, stars, simple[0], simple[1], cute[0], cute[1],
          active[0], active[1], pure[0], pure[1], cool[0],
          cool[1], extra, source];
    },
    addDep: function(sourceType, c) {
      if (!this.deps[sourceType]) {
        this.deps[sourceType] = [];
      }
      if (c == this) {
        alert("Self reference: " + this.type.type + " " + this.id + " " + this.name);
      }
      this.deps[sourceType].push(c);
    },
    getDeps: function(indent) {
      var ret = "";
      for (var sourceType in this.deps) {
        for (var i in this.deps[sourceType]) {
          var c = this.deps[sourceType][i];
          ret += indent + '[' + sourceType + '][' + c.type.mainType + ']'
              + c.name + (c.own ? '' : '(缺)')+ '&#xA;';
          ret += c.getDeps(indent + "    ");
        }
      }
      return ret;
    },
    calc: function(filters) {
      var s = 0;
      var self = this;
      this.tmpScoreByCategory = ScoreByCategory();
      this.bonusByCategory = ScoreByCategory();
      for (var i in FEATURES) {
        var f = FEATURES[i]; 
        if (filters[f]) {
          var sub = filters[f] * self[f][2];
          if (filters.boost1 && filters.boost1 == f) {
            sub *= 1.27;
          }
          if (filters.boost2 && filters.boost2 == f) {
            sub *= 1.27 * 1.4;
          }
          if (filters[f] > 0) {
            if (sub > 0) {
              this.tmpScoreByCategory.record(f, sub, 0); // matched with major
            } else {
              this.tmpScoreByCategory.record(f, 0, sub); // mismatch with minor
            }
          } else {
            if (sub > 0) {
              this.tmpScoreByCategory.record(f, 0, sub); // matched with minor
            } else {
              this.tmpScoreByCategory.record(f, sub, 0); // mismatch with major
            }
            
          }
          if (sub > 0) {
            s += sub;
          }
        }
      }

      this.tmpScore = Math.round(s);
      this.tmpBonus = 0;
      if (filters.bonus) {
        var total = 0;
        for (var i in filters.bonus) {
          var bonus = filters.bonus[i];
          var resultlist = bonus.filter(this);
          var result = resultlist[0];
          if (result > 0) {
            // result > 0 means match
            this.bonusByCategory.addRaw(filters, resultlist[1]);
            total += result;
            if (bonus.replace) {
              this.tmpScore /= 10;
              this.tmpScoreByCategory.f();
            }
          }
        }
        this.tmpBonus = total;
        this.tmpScore += total;
      }
      if (this.type.needFilter() && currentLevel && currentLevel.filter) {
        currentLevel.filter.filter(this);
      }
      this.tmpScore = Math.round(this.tmpScore);   
      this.tmpBonus = Math.round(this.tmpBonus);
    }
  };
}

function ScoreByCategory() {
  var initial = {};
  for (var c in FEATURES) {
    initial[FEATURES[c]] = [0, 0];
  }
  return {
    scores: initial,
    // score: positive - matched, negative - no matched
    record: function(category, major, minor) {
      this.scores[category] = [major, minor];
    },
    add: function(other) {
      if (other) {
        for (var c in other.scores) {
          this.scores[c][0] += other.scores[c][0];
          this.scores[c][1] += other.scores[c][1];
        }
      }
    },
    round: function() {
      for (var c in this.scores) {
        this.scores[c][0] = Math.round(this.scores[c][0]);
        this.scores[c][1] = Math.round(this.scores[c][1]);
      }
    },
    addRaw: function(filters, rawdata) {
      for (var i in FEATURES) {
        var f = FEATURES[i]; 
        if (filters[f] && rawdata[f] > 0) {
          if (filters[f] > 0) { // level requires major
            this.scores[f][0] += rawdata[f];
          } else { // level requires minor
            this.scores[f][1] += rawdata[f];
          }
        }
      }
    },
    f: function() {
      for (var c in this.scores) {
        this.scores[c][0] /= 10;
        this.scores[c][1] /= 10;
      }
    }
  };
}

function MyClothes() {
  return {
    mine: {},
    size: 0,
    filter: function(clothes) {
      this.mine = {}
      this.size = 0;
      for (var i in clothes) {
        if (clothes[i].own) {
          var type = clothes[i].type.mainType;
          if (!this.mine[type]) {
            this.mine[type] = [];
          }
          this.mine[type].push(clothes[i].id);
          this.size ++;
        }
      }
    },
    serialize: function() {
      var txt = "";
      for (var type in this.mine) {
        txt += type + ":" + this.mine[type].join(',') + "|";
      }
      return txt;
    },
    deserialize: function(raw) {
      var sections = raw.split('|');
      this.mine = {};
      this.size = 0;
      for (var i in sections) {
        if (sections[i].length < 1) {
          continue;
        }
        var section = sections[i].split(':');
        var type = section[0];
        if (type == "上装") {
          type = "上衣";
        }
        this.mine[type] = section[1].split(',');
        this.size += this.mine[type].length;
      }
    },
    update: function(clothes) {
      var x = {};
      for (var type in this.mine) {
        x[type] = {};
        for (var i in this.mine[type]) {
          var id = this.mine[type][i];
          x[type][id] = true;
        }
      }
      for (var i in clothes) {
        clothes[i].own = false;
        var t = clothes[i].type.mainType;
        var id = clothes[i].id
        if (x[t] && x[t][clothes[i].id]) {
          clothes[i].own = true;
        }
      }
    }
  };
}

function Source(source) {
  var sources = source.split("/");
  var compact = [];
  for (var i in sources) {
    compact.push(compactSource(sources[i]));
  }
  return {
    rawSource: source,
    sources: sources,
    compacts: compact,
    compact: function() {
      return this.compacts.join("/");
    }
  };
}

function compactSource(source) {
  if (source.indexOf('进') >= 0) {
    return '进';
  }
  if (source.indexOf('定') >= 0) {
    return '染';
  }
  if (source.indexOf('设计图') >= 0) {
    return '图';
  }
  if (source.indexOf('活动') >= 0) {
    return source.substring(3);
  }
  return source;
}

var clothes = function() {
  var reals = {};

  var ret = [];
  for (var i in wardrobe) {
    var key = wardrobe[i][1] + wardrobe[i][2];
    ret.push(Clothes(wardrobe[i], reals[key]));
  }
  return ret;
}();

var clothesSet = function() {
  var ret = {};
  for (var i in clothes) {
    var t = clothes[i].type.mainType;
    if (!ret[t]) {
      ret[t] = {};
    }
    ret[t][clothes[i].id] = clothes[i];
  }
  return ret;
}();

var clothesRanking = function() {
  var ret = {};
  for (var i in clothes) {
    var t = clothes[i].type.type;
    if (!ret[t]) {
      ret[t] = [];
    }
    ret[t].push(clothes[i]);
  }
  return ret;
}();
var shoppingCart = ShoppingCart();
function ShoppingCart() {
  return {
    cart: {},
    totalScore: fakeClothes(this.cart),
    clear: function() {
      this.cart = {};
    },
    contains: function(c) {
      return this.cart[c.type.type] == c;
    },
    remove: function(c) {
      delete this.cart[c];
    },
    putAll: function(clothes) {
      for (var i in clothes) {
        this.put(clothes[i]);
      }
    },
    put: function(c) {
      this.cart[c.type.type] = c;
    },
    toList: function(sortBy) {
      var ret = [];
      for (var t in this.cart) {
        ret.push(this.cart[t]);
      }
      return ret.sort(sortBy);
    },
    getScore: function(cate) {
      if (this.cart[cate]) {
        return this.cart[cate].tmpScore;
      }
      return 0;
    },
    calc: function() {
      /*
      for (var c in this.cart) {
        this.cart[c].calc(criteria);
      }
      */
      // fake a clothes
      this.totalScore = fakeClothes(this.cart);
    }
  }
};

function accScore(total, totalBonus, items) {
  if (items < ACCRATIO.length) {
    return (total - totalBonus) * ACCRATIO[items] + totalBonus;
  }
  return (total - totalBonus) * 0.4 + totalBonus;
}

function fakeClothes(cart) {
  var totalScore = 0;
  var totalAccessoriesBonus = 0;
  var totalAccessories = 0;
  var totalScoreByCategory = ScoreByCategory();
  var totalBonusByCategory = ScoreByCategory();
  var totalAccessoriesByCategory = ScoreByCategory();
  var totalAccessoriesBonusByCategory = ScoreByCategory();
  var numAccessories = 0;
  for (var c in cart) {
    if (c.split('-')[0] == "饰品") {
      totalAccessories += cart[c].tmpScore;
      totalAccessoriesBonus += cart[c].tmpBonus;
      totalAccessoriesByCategory.add(cart[c].tmpScoreByCategory);
      totalAccessoriesBonusByCategory.add(cart[c].bonusByCategory);
      numAccessories ++;
    } else {
      totalScore += cart[c].tmpScore;
      totalScoreByCategory.add(cart[c].tmpScoreByCategory);
      totalBonusByCategory.add(cart[c].bonusByCategory);
    }
  }
  totalScore += accScore(totalAccessories, totalAccessoriesBonus, numAccessories);
  for (var c in totalAccessoriesByCategory.scores) {
    totalAccessoriesByCategory.scores[c][0] = accScore(totalAccessoriesByCategory.scores[c][0], 0,
        numAccessories);
    totalAccessoriesByCategory.scores[c][1] = accScore(totalAccessoriesByCategory.scores[c][1], 0,
        numAccessories);
    totalAccessoriesBonusByCategory.scores[c][0] = totalAccessoriesBonusByCategory.scores[c][0]; // WTF...bonus never chagnes
    totalAccessoriesBonusByCategory.scores[c][1] = totalAccessoriesBonusByCategory.scores[c][1];
  }
  totalScoreByCategory.add(totalAccessoriesByCategory);
  totalBonusByCategory.add(totalAccessoriesBonusByCategory);
  totalScoreByCategory.round();
  totalBonusByCategory.round();
  
  var scores = totalScoreByCategory.scores;
  var bonus = totalBonusByCategory.scores;
  return {
    name: '总分',
    tmpScore: Math.round(totalScore),
    toCsv: function() {
      return ['', '', '',
          scoreWithBonusTd(scores.simple[0], bonus.simple[0]), 
          scoreWithBonusTd(scores.simple[1], bonus.simple[1]),
          scoreWithBonusTd(scores.cute[0], bonus.cute[0]),
          scoreWithBonusTd(scores.cute[1], bonus.cute[1]),
          scoreWithBonusTd(scores.active[0], bonus.active[0]),
          scoreWithBonusTd(scores.active[1], bonus.active[1]),
          scoreWithBonusTd(scores.pure[0], bonus.pure[0]),
          scoreWithBonusTd(scores.pure[1], bonus.pure[1]),
          scoreWithBonusTd(scores.cool[0], bonus.cool[0]),
          scoreWithBonusTd(scores.cool[1], bonus.cool[1]), '', ''];
    }
  };
}

function scoreWithBonusTd(score, bonus) {
  return score + '<div>+' + bonus + '</div>';
}

function realRating(a, b, realScoreA, realScoreB, type) {
  real = a ? a : b;
  realScore = a ? realScoreA : realScoreB;
  symbol = a ? 1 : -1;
  score = symbol * type.score[real];
  dev = type.deviation[real];
  if (realScore) {
    score = symbol * realScore;
    dev = 0;
  } else {
    score = symbol * type.score[real];  
    dev = type.deviation[real];
  }
  return [a, b, score, dev];
}

function parseSource(source, key) {
  var idx = source.indexOf(key);
  var ridx = source.indexOf('/', idx+1);
  if (ridx < 0) ridx = 99;
  if (idx >= 0) {
    var id = source.substring(idx + 1, Math.min(source.length, ridx));
    while (id.length < 3) id = '0' + id;
    return id;
  }
  return null;
}

function calcDependencies() {
  for (var i in clothes) {
    var c = clothes[i];
    var evol = parseSource(c.source.rawSource, '进');
    if (evol && clothesSet[c.type.mainType][evol]) {
      clothesSet[c.type.mainType][evol].addDep('进', c);
    }
    var remake = parseSource(c.source.rawSource, '定');
    if (remake && clothesSet[c.type.mainType][remake]) {
      clothesSet[c.type.mainType][remake].addDep('定', c);
    }
  }
  for (var i in pattern) {
    var target = clothesSet[pattern[i][0]][pattern[i][1]];
    var source = clothesSet[pattern[i][2]][pattern[i][3]];
    if (!target) continue;
    source.addDep('设计图', target);
  }
}

function load(myClothes) {
  var cs = myClothes.split(",");
  for (var i in clothes) {
    clothes[i].own = false;
    if (cs.indexOf(clothes[i].name) >= 0) {
      clothes[i].own = true;
    }
  }
  var mine = MyClothes();
  mine.filter(clothes);
  return mine;
}

function loadNew(myClothes) {
  var mine = MyClothes();
  mine.deserialize(myClothes);
  mine.update(clothes);
  return mine;
}

function loadFromStorage() {
  var myClothes;
  var myClothesNew;
  if (localStorage) {
    myClothesNew = localStorage.myClothesNew;
    myClothes = localStorage.myClothes;
  } else {
    myClothesNew = getCookie("mine2");
    myClothes = getCookie("mine");
  }
  if (myClothesNew) {
    return loadNew(myClothesNew);
  } else if (myClothes) {
    return load(myClothes);
  }
  return MyClothes();
}

function getCookie(c_name) {
  if (document.cookie.length>0) { 
    c_start=document.cookie.indexOf(c_name + "=")
    if (c_start!=-1) { 
      c_start=c_start + c_name.length+1 
      c_end=document.cookie.indexOf(";",c_start)
      if (c_end==-1) {
        c_end=document.cookie.length
      }
      return unescape(document.cookie.substring(c_start,c_end))
    }
  }
  return "";
}

function setCookie(c_name,value,expiredays) {
  var exdate=new Date()
  exdate.setDate(exdate.getDate()+expiredays)
  document.cookie=c_name+ "=" +escape(value)+
  ((expiredays==null) ? "" : "; expires="+exdate.toGMTString())
}

function save() {
  var myClothes = MyClothes();
  myClothes.filter(clothes);
  var txt = myClothes.serialize();
  if (localStorage) {
    localStorage.myClothesNew = txt;
  } else {
    setCookie("mine2", txt, 3650);
  }
  return myClothes;
}