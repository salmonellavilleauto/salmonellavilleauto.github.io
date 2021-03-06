var oldRx = window.Rx;
window.Rx = null;
(function () {
    var win = window,
        oldDefine = win.define,
        oldRequire = win.require,
        mods = {},
        names = [];
    function values(obj, keys) {
        var numKeys = keys.length, values = [], i = 0;
        for (; i < numKeys; i++) {
            values.push(obj[keys[i]]);
        }
        return values;
    }
    function dependsOnExports(deps) {
        var numDeps = deps.length, i = 0;
        for (; i < numDeps; i++) {
            if (deps[i] === "exports") {
                return true;
            }
        }
        return false;
    }
    function define(deps, fact) {
        var name = names.shift(),
            args = arguments,
            dependencies = deps,
            factory = fact;
        mods.exports = {};
        if (args.length === 1) {
            factory = deps;
            dependencies = [];
        }
        var modVal = typeof factory === "function" ?
            factory.apply(this, values(mods, dependencies)) :
            factory;
        mods[name] = dependsOnExports(dependencies) !== -1 ?
            modVal || mods.exports :
            modVal;
    }
    define.amd = {};
    define.names = names;
    window.define = define;
}());

//
// Module: registry
//

define.names.push("registry");
// Some legacy concepts in here. To be refactored out later.
define(["require", "exports"], function(require, exports) {
    /**
    * Get the current user's actor id which is used in graph queries.
    */
    exports.myActorId = "me";

    /**
    * Well known query properties.
    */
    exports.queryProperties = {
        /**
        * Identifies a tag query property.
        */
        tag: "graphPluginTag",
        /**
        * Identifies a term query property. Provide the raw term. Term is
        * URI encoded by the graph plugin.
        */
        term: "graphPluginTerm",
        /**
        * Identifies a raw query url component. Used by GNL queries.
        */
        url: "graphPluginUrl",
        /**
        * Identifies an email query. Provide the email to look up here.
        * If not provided, current user is queried instead.
        */
        email: "graphPluginEmail",
        /**
        * Identifies a person query by full name. This is used as a person
        * query fallback if email is not set.
        */
        fullName: "graphPluginFullName",
        /**
        * Identifies the query property.
        */
        query: "queryPluginQuery",
        /**
        * Identifies a userName query. Provide the userName to look up here.
        */
        userName: "peoplePluginUserName"
    };

    var Tags = (function () {
        function Tags() {
        }
        /**
        * Returns array containing all tag properties in the Tags class
        */
        Tags.getTags = function () {
            var tags = [];
            for (var property in this) {
                if (this.hasOwnProperty(property) && typeof this[property] === "string") {
                    tags.push(this[property]);
                }
            }
            return tags;
        };

        /**
        * Returns tag queries for all predefined tags.
        *
        * @param selectProperties ManagedProperties to include in the results for each item
        * @param actorId The actor id of the current user
        * @param clientType usedfor logging to track which application made the query
        * @param terms The terms to search for. If not specified '*' is used. I.e., a wild-card search.
        * @param rowLimit Limits the number of rows returned by most tag queries. My Pulse is one exception. If not specified, 50 is used.
        *
        * @return dictionary containg all predefined tags
        */
        Tags.getTagQueries = function (selectProperties, actorId, clientType, terms, rowLimit) {
            rowLimit = rowLimit || 50;
            var encodedTerm = encodeURIComponent(terms || "*"), prefix = "/_api/search/query", queryText = prefix + "?QueryText='(" + encodedTerm, rankingModel = "0c77ded8-c3ef-466d-929d-905670ea1d72", docFilter = encodeURIComponent("(FileExtension:doc OR FileExtension:docx OR FileExtension:ppt OR FileExtension:pptx OR FileExtension:xls OR FileExtension:xlsx OR FileExtension:pdf)"), graphQueryTemplate = "and(actor(" + actorId + "\\,action\\:####)\\,actor(" + actorId + "\\,or(action\\:####\\,action\\:1036\\,action\\:1037\\,action\\:1039)))", graphQueryAction = function (action) {
                return encodeURIComponent(graphQueryTemplate.replace(/####/g, action));
            };
            var queries = {};

            //
            // Related people.
            //
            queries["Related People"] = queryText + ")%27&" + "RowLimit=%27100%27&" + "Properties=%27GraphQuery:actor(" + actorId + "%5C%2Caction%5C%3A1019),GraphRankingModel%3Aaction%5C%3A1019%5C%2Cweight%5C%3A1%5C%2CedgeFunc%5C%3Aweight%5C%2CmergeFunc%5C%3Amax%27&" + "RankingModelId=%270c77ded8-c3ef-466d-929d-905670ea1d72%27&" + "BypassResultTypes=true&" + "SelectProperties='" + selectProperties + "'&" + "ClientType='" + clientType + "'";

            //
            // trendingAroundMe.
            //
            queries[this.trendingAroundMe] = queryText + ")%20AND%20" + docFilter + "'" + "&Properties='GraphQuery%3A" + graphQueryAction("1020") + ",GraphRankingModel%3Aaction%5C%3A1020%5C%2Cweight%5C%3A1%5C%2CedgeFunc%5C%3Aweight%5C%2CmergeFunc%5C%3Amax'&" + "SelectProperties='" + selectProperties + "'&" + "RankingModelId='" + rankingModel + "'&" + "RowLimit=" + rowLimit + "&" + "StartRow=0&" + "ClientType='" + clientType + "'&" + "BypassResultTypes=true";

            //
            // sharedWithMe.
            //
            queries[this.sharedWithMe] = queryText + ")%20AND%20" + docFilter + "'&" + "QueryTemplate='{searchTerms} (SharedWithUsersOWSUSER:{User.PreferredName})'&" + "SelectProperties='" + selectProperties + "'&" + "RankingModelId='" + rankingModel + "'&" + "SortList='LastModifiedTime:descending'&" + "RowLimit=" + rowLimit + "&" + "StartRow=0&" + "ClientType='" + clientType + "'&" + "BypassResultTypes=true";

            //
            // likedByMe.
            //
            queries[this.likedByMe] = queryText + ")%20AND%20" + docFilter + "'&" + "Properties='GraphQuery%3A" + graphQueryAction("1005") + "'&" + "SelectProperties='" + selectProperties + "'&" + "RankingModelId='" + rankingModel + "'&" + "SortList='LastModifiedTime:descending'&" + "RowLimit=" + rowLimit + "&" + "StartRow=0&" + "ClientType='" + clientType + "'&" + "BypassResultTypes=true";

            //
            // viewedByMe.
            //
            queries[this.viewedByMe] = queryText + ")%20AND%20" + docFilter + "'&" + "Properties='GraphQuery%3A" + graphQueryAction("1001") + ",GraphRankingModel%3Aaction%5C%3A1001%5C%2Cweight%5C%3A1%5C%2CedgeFunc%5C%3Atime%5C%2CmergeFunc%5C%3Amax'&" + "SelectProperties='" + selectProperties + "'&" + "RankingModelId='" + rankingModel + "'&" + "RowLimit=" + rowLimit + "&" + "StartRow=0&" + "ClientType='" + clientType + "'&" + "BypassResultTypes=true";

            //
            // myPulse.
            //
            queries[this.myPulse] = queryText + ")%20AND%20" + docFilter + "'&" + "Properties='GraphQuery%3A" + graphQueryAction("1021") + ",GraphRankingModel%3Aaction%5C%3A1021%5C%2Cweight%5C%3A1%5C%2CedgeFunc%5C%3Aweight%5C%2CmergeFunc%5C%3Amax'&" + "SelectProperties='" + selectProperties + "'&" + "RankingModelId='" + rankingModel + "'&" + "RowLimit=36&" + "StartRow=0&" + "ClientType='" + clientType + "'&" + "BypassResultTypes=true";

            //
            // modifiedByMe.
            //
            queries[this.modifiedByMe] = queryText + ")%20AND%20" + docFilter + "'&" + "Properties='GraphQuery%3A" + graphQueryAction("1003") + "'&" + "SelectProperties='" + selectProperties + "'&" + "SortList='LastModifiedTime:descending'&" + "RowLimit=" + rowLimit + "&" + "StartRow=0&" + "ClientType='" + clientType + "'&" + "BypassResultTypes=true";

            //
            // presentedToMe.
            //
            queries[this.presentedToMe] = queryText + ")%20AND%20" + docFilter + "'&" + "Properties='GraphQuery%3Aand(" + graphQueryAction("1024") + "%5C%2Cactor(" + actorId + "%5C%2Cor(action%5C%3A1024%5C%2Caction%5C%3A1001%5C%2Caction%5C%3A1003%5C%2Caction%5C%3A1020)))%2CGraphRankingModel%3Aaction%5C%3A1024%5C%2Cweight%5C%3A1%5C%2CedgeFunc%5C%3Atime%5C%2CmergeFunc%5C%3Amax'&" + "SelectProperties='" + selectProperties + "'&" + "RankingModelId='" + rankingModel + "'&" + "RowLimit=" + rowLimit + "&" + "StartRow=0&" + "ClientType='" + clientType + "'&" + "BypassResultTypes=true";

            return queries;
        };
        Tags.myPulse = "My Pulse";

        Tags.viewedByMe = "Viewed by me";

        Tags.modifiedByMe = "Modified by me";

        Tags.presentedToMe = "Presented to me";

        Tags.trendingAroundMe = "Trending around me";

        Tags.sharedWithMe = "Shared with me";

        Tags.likedByMe = "Liked by me";
        return Tags;
    })();
    exports.Tags = Tags;
});

//
// Module: ../ext/msfuncy-0.9
//

define.names.push("../ext/msfuncy-0.9");
function bindMsFuncyMod(mod) {
    /// <summary>
    /// Binds the MsFuncy module to the specified host objects.
    /// </summary>
    /// <param name="mod" type="Object">
    /// The module host object.
    /// </param>
    /// <returns type="Object">
    /// The bound MsFuncy module.
    /// </returns>

    function rest(a, skip) {
        return toArray(a).slice(skip);
    }

    var

    //
    // VALIDATION FUNCTIONS.
    //

    isArray = mod.isArray = Array.isArray || function (obj) {
        /// <summary>
        /// Returns true if the specified object is an array or false.
        /// </summary>
        /// <param name="obj" type="???">
        /// The object to check.
        /// </param>
        /// <returns type="Boolean" />
        return obj instanceof Array;
    },

    isTypeOf = function (type) {
        return function (val) { return typeof val === type; };
    },

    isBool = mod.isBool = isTypeOf("boolean"),

    isFunc = mod.isFunc = isTypeOf("function"),

    isNumber = mod.isNumber = isTypeOf("number"),

    isString = mod.isString = isTypeOf("string"),

    isUndef = mod.isUndef = isTypeOf("undefined"),

    isNull = mod.isNull = function (val) {
        return val === null;
    },

    isNullOrObject = isTypeOf("object"),

    isObject = mod.isObject = function (val) {
        return !isNull(val) && isNullOrObject(val);
    },

    isUndefOr = mod.isUndefOr = function (func) {
        return function (val) { return isUndef(val) || func(val); };
    },

    //
    // INDEPENDENT FUNCTIONS.
    //

    apply = mod.apply = function (func, ctx, args) {
        /// <summary>
        /// Applies the specified function with the specified context and
        /// arguments.
        /// </summary>
        /// <param name="func" type="Function">
        /// The function to apply.
        /// </param>
        /// <param name="ctx" type="???">
        /// The context in which to apply the function.
        /// </param>
        /// <param name="args" type="Array">
        /// The arguments to apply.
        /// </param>
        /// <returns type="???" />
        return func.apply(ctx, args || []);
    },

    argn = mod.argn = function (n) {
        return function () {
            return arguments[n];
        };
    },

    arg = mod.arg = argn(0),

    skip = mod.skip = function (items, num) {
        var res = [], numItems = items.length, i = num;
        for (; i < numItems; i++) {
            res.push(items[i]);
        }
        return res;
    },

    toArray = mod.toArray = function (obj) {
        /// <summary>
        /// Turns the array like object into a real array.
        /// </summary>
        /// <param name="obj">
        /// The array like object.
        /// </param>
        /// <returns type="Array" />
        if (isArray(obj)) { return obj; }
        return skip(obj, 0);
    },

    //
    // DEPENDENT FUNCTIONS.
    //

    splat = mod.splat = function (func) {
        return function (args) {
            return apply(func, this, args);
        };
    },

    unsplat = mod.unsplat = function (func) {
        return function () {
            return func.call(this, toArray(arguments));
        };
    },

    bind = mod.bind = function (func) {
        /// <summary>
        /// Returns a function which will invoke the specified function with the
        /// specified zero or more arguments.
        /// </summary>
        /// <param name="func" type="Function">
        /// The function to invoke.
        /// </param>
        /// <returns type="Function" />
        var leftArgs = skip(arguments, 1);
        return function () {
            var numArgs = arguments.length,
                allArgs = numArgs > 0 ?
                    cat(leftArgs, toArray(arguments)) :
                    leftArgs;
            return apply(func, this, allArgs);
        };
    },

    wrap = mod.wrap = function (arg) {
        return isArray(arg) ? arg : [arg];
    },

    cat = mod.cat = function (a, b) {
        return wrap(a).concat(wrap(b));
    },

    cbind = mod.cbind = function (func, ctx) {
        /// <summary>
        /// Returns a function which will invoke the specified function with the
        /// specified context and zero or more arguments.
        /// </summary>
        /// <param name="func" type="Function">
        /// The function to invoke.
        /// </param>
        /// <param name="ctx">
        /// The context to invoke with.
        /// </param>
        /// <returns type="Function" />
        var lArgs = skip(arguments, 2);
        return function () {
            return apply(func, ctx, cat(lArgs, toArray(arguments)));
        };
    },

    lateBind = mod.lateBind = function () {
        /// <summary>
        /// Returns a function which will invoke the function specified as the
        /// first argument with the specified zero or more arguments.
        /// </summary>
        /// <returns type="Function" />
        var lArgs = toArray(arguments);
        return function (func) {
            /// <param name="func" type="Function">
            /// The function to late bind.
            /// </param>
            return apply(func, this, lArgs.concat(skip(arguments, 1)));
        };
    },

    k = mod.k = function (val) { return function () { return val; }; },

    falser = mod.falser = bind(k, false),

    aggregate = mod.aggregate = function (items, accumulator, seed) {
        /// <summary>
        /// Traverses the specified list of items and uses the specified
        /// accumulator to accumulate a value.
        /// </summary>
        /// <param name="items" type="Array">
        /// The list of items to traverse.
        /// </param>
        /// <param name="accumulator" type="Function">
        /// The accumulator to apply for each item.
        /// </param>
        /// <param name="seed">
        /// The initial value.
        /// </param>
        var val = seed, numItems = items.length;
        for (var i = 0; i < numItems; i++) {
            val = accumulator(items[i], val);
        }
        return val;
    },

    pipe = mod.pipe = function () {
        /// <summary>
        /// Creates a pipe which pipes values through the specified functions.
        /// </summary>
        var funcs = toArray(arguments), numFuncs = funcs.length;
        return function (obj) {
            for (var i = 0; i < numFuncs; i++) {
                obj = funcs[i].call(this, obj);
            }
            return obj;
        }
    },

    falsy = mod.falsy = function (value) {
        /// <summary>
        /// Returns true if the specified value is falsy or false.
        /// </summary>
        /// <param name="value">
        /// The value to check.
        /// </param>
        return !value;
    },

    falsyer = mod.falsyer = function (func) {
        return function () {
            return falsy(apply(func, this, toArray(arguments)));
        };
    },

    has = mod.has = function (memberName, obj) {
        /// <summary>
        /// Returns true if the specified object has the specified member or
        /// false.
        /// </summary>
        /// <param name="memberName" type="String">
        /// The name of the member to check for.
        /// </param>
        /// <param name="obj">
        /// The object to check.
        /// </param>
        return memberName in obj;
    },

    haser = mod.haser = bind(bind, has),

    get = mod.get = function (memberName, obj) {
        /// <summary>
        /// Get the value of the specified member of the specified object.
        /// </summary>
        /// <param name="memberName" type="String">
        /// The name of the member.
        /// </param>
        /// <param name="Object">
        /// The object with the member.
        /// </param>
        return obj[memberName];
    },

    cget = mod.cget = function (memberName) {
        /// <summary>
        /// Get the value of the specified member of the context.
        /// </summary>
        /// <param name="memberName" type="String">
        /// The name of the member.
        /// </param>
        return get(memberName, this);
    },

    getter = mod.getter = function (member) {
        return function (obj) { return obj[member]; };
    },

    cgetter = mod.cgetter = bind(bind, cget),

    getLength = mod.getLength = getter("length"),

    collect = mod.collect = base(function (args, func, acc) {
        return acc.concat([apply(func, this, args)]);
    }, []),

    select = mod.select = base(function (args, member, acc) {
        acc[member] = args[0][member];
        return acc;
    }, {}),

    alias = mod.alias = function (memberName, alias, obj) {
        obj[alias] = obj[memberName];
        return obj;
    },

    first = mod.first = function (predicate, array) {
        if (isFunc(predicate)) {
            if (getLength(arguments) === 1) {
                return bind(first, predicate);
            }
            var i = 0, numItems = getLength(array), item;
            for (; i < numItems; i++) {
                item = array[i];
                if (predicate(item)) {
                    return item;
                }
            }
            return;
        }
        return get(0, predicate);
    },

    last = mod.last = function (arr) {
        return get(getLength(arr) - 1, arr);
    },

    tamper = mod.tamper = function () {
        return pipe(apply(bind(collect, arg), this, toArray(arguments)), first);
    },

    when = mod.when = function () {
        var steps = arguments, numberOfSteps = getLength(steps);
        return function () {
            var i = 0, args = toArray(arguments);
            for (; i < numberOfSteps; i++) {
                if (!steps[i].apply(this, args)) {
                    break;
                }
            }
        };
    },

    traverse = mod.traverse = function (picker, elements, obj) {
        return aggregate(elements, picker, obj);
    },

    map = mod.map = function (func, items) {
        var numItems = items.length, newItems = [];
        for (var i = 0; i < numItems; i++) {
            newItems.push(func.call(this, items[i]));
        }
        return newItems;
    },

    max = mod.max = splat(Math.max),

    maxProp = mod.maxProp = function (prop, items) {
        return max(map(prop, items));
    },

    maxLength = mod.maxLength = bind(maxProp, getLength),

    maxArg = mod.maxArg = function () {
        var argsLengths = mod.map(getLength, arguments);
        return Math.max.apply(Math, argsLengths);
    },

    zip = mod.zip = function () {
        var length = maxLength(arguments);
        var results = [];
        for (var i = 0; i < length; i++) {
            results[i] = map(getter(i), arguments);
        }
        return results;
    },

    interleave = mod.interleave = function () {
        return apply(Array.prototype.concat, [], splat(zip)(arguments));
    },

    distinct = mod.distinct = function (items, predicate) {
        var keys = !isUndef(predicate) ?
                        ((isString(predicate)) ?
                            map(getter(predicate), items) :
                            map(predicate, items)) :
                        items;

        var _items = [];
        var _keys = [];
        //add some _each function as well?
        for (var i = 0; i < items.length; i++) {
            //should add contains method or something, indexOf not supported in IE8
            if (_keys.indexOf(keys[i]) === -1) {
                _keys.push(keys[i]);
                _items.push(items[i]);
            }
        }

        return _items;
    },

    compact = mod.compact = function () {
        if (!isArray(arguments[0])) {
            return arguments[0];
        }
        return arguments[0].filter(function (d) {
            return !isUndef(d) && !isNull(d);
        });
    },

    ns = mod.ns = function (path) {
        var root = {};
        aggregate(path.split("."), function (part, obj) {
            return obj[part] = {};
        }, root);
        return root;
    },

    split = function (token, str) {
        return str.split(token);
    },

    extract = mod.extract = function (extracter, members, source) {
        var wrappedMembers = isArray(members) ? members : [members];
        var values = aggregate(wrappedMembers, function (member, seed) {
            seed.push(get(member, source));
            return seed;
        }, []);
        return extracter.apply(this, values);
    },

    extractor = mod.extractor = bind(bind, extract),

    set = mod.set = function (member, value, obj) {
        (obj || this)[member] = value;
        return (obj || this);
    },

    setter = mod.setter = bind(bind, set),

    refine = mod.refine = function (refiners, source) {
        var result = {};
        for (var refiner in refiners) {
            set(
                refiner,
                get(refiner, refiners).call(this, source),
                result
            );
        }
        return result;
    },

    thr = mod.thr = function (error) {
        throw error;
    },

    createError = mod.createError = function (number, message) {
        /// <summary>
        /// Creates an error with the specified error number and error message.
        /// </summary>
        /// <param name="number" type="Number">
        /// The predicate which will decide if to throw or not.
        /// </param>
        /// <param name="message" type="String">
        /// The error message.
        /// Default is all values.
        /// </param>
        /// <returns type="String" />
        var error = new Error(message);
        error.number = number;
        return error;
    },

    throwError = mod.throwError = function (number, message) {
        /// <summary>
        /// Throws an error with the specified error number and error message.
        /// </summary>
        /// <param name="number" type="Number">
        /// The predicate which will decide if to throw or not.
        /// </param>
        /// <param name="message" type="String">
        /// The error message.
        /// Default is all values.
        /// </param>
        /// <returns type="String" />
        throw mod.createError(number, message);
    },

    handleOrRethrow = mod.handleOrRethrow = function (predicate, action) {
        /// <summary>
        /// Rethrows the specified error if the predicate returns false. If the
        /// predicate returns true the specified action is invoked.
        /// </summary>
        /// <param name="predicate" type="Function">
        /// The predicate which will decide if to throw or not.
        /// </param>
        /// <param name="action" type="Function">
        /// The action to invoke if predicate returns true.
        /// Default is all values.
        /// </param>
        /// <returns type="Array" />
        return function (error) {
            return predicate(error) && !void (action(error)) || thr(error);
        };
    },

    thrower = mod.thrower = bind(bind, thr),

    err = mod.err = function (msg) {
        return new Error(msg);
    },

    explain = mod.explain = function (msg, func) {
        return function () {
            try {
                return apply(func, this, toArray(arguments));
            } catch (e) {
                thr(set("inner", e, err(msg + ": " + e.message)));
            }
        };
    },

    always = mod.always = function (returnValue, func) {
        return function () {
            apply(func, this, toArray(arguments));
            return returnValue;
        };
    },

    fact = mod.fact = bind(always, true),

    lose = mod.lose = bind(always, undefined),

    fork = mod.fork = function () {
        var funcs = toArray(arguments), numFuncs = funcs.length;
        return function () {
            for (var res = [], i = 0; i < numFuncs; i++) {
                res.push(funcs[i].call(this, arguments[i]));
            }
            return res;
        };
    },

    pre = mod.pre = function () {
        var args = toArray(arguments),
            lastArg = args.length - 1,
            forker = apply(fork, this, args.slice(0, lastArg)),
            func = args[lastArg];
        return function () {
            return apply(func, this, apply(forker, this, toArray(arguments)));
        };
    },

    asrt = mod.asrt = function (predicate, message, value) {
        return !predicate.call(this, value) && thr(err(message)) || value;
    },

    asrtion = mod.asrtion = bind(bind, asrt),

    dflt = mod.dflt = function (defaultValue, func) {
        return function () {
            var res = apply(func, this, toArray(arguments));
            return typeof res === "undefined" ? defaultValue : res;
        };
    },

    qp = mod._qp = [
        {
            p: /^\[\s*(\w+)\s*=\s*(\d+)\s*]$/,
            f: function (match, arr) {
                return first(pipe(
                    getter(match[1]),
                    eq(parseInt(match[2], 10))),
                arr);
            }
        },
        {
            p: /^\[\s*(\w+)\s*=\s*'([^']*)'\s*]$/,
            f: function (match, arr) {
                return first(pipe(getter(match[1]), eq(match[2])), arr);
            }
        }
    ],

    numQp = qp.length,

    qget = mod.qget = function (query, obj) {
        if (query[0] !== "[") {
            return get(query, obj);
        }
        var i = 0, res, current;
        for (; i < numQp; i++) {
            current = qp[i];
            if (res = current.p.exec(query)) {
                return current.f(res, obj);
            }
        }
    },

    oquery = mod.oquery = function (path, o) {
        return traverse(qget, path, o);
    },

    eq = mod.eq = function (first, second) {
        return arguments.length === 1 ?
            function (second) {
                return eq(first, second);
            } :
            first === second;
    },

    keyz = mod.keys = function (obj) {
        /// <summary>
        /// Retrieves the name of all of the specified object's properties.
        /// </summary>
        /// <param name="obj" type="Object">
        /// The object to get keys for.
        /// </param>
        /// <returns type="Array" />
        var key, keys = [];
        for (key in obj) {
            keys.push(key);
        }
        return keys;
    },

    valuez = mod.values = function (obj, keys) {
        /// <summary>
        /// Retreieves all of the values for all of the specified object's
        /// properties.
        /// </summary>
        /// <param name="obj" type="Object">
        /// The object to retrieve values from.
        /// </param>
        /// <param name="keys" type="Array" optional="true">
        /// An optional list of the properties to retrieve the values for.
        /// Default is all values.
        /// </param>
        /// <returns type="Array" />
        keys = keys || keyz(obj);
        var numKeys = keys.length, values = [], i = 0;
        for (; i < numKeys; i++) {
            values.push(obj[keys[i]]);
        }
        return values;
    },

    extend = mod.extend = function () {
        /// <summary>
        /// Extend the first object with the contents of one or more objects.
        /// That means that at least two objects must be specified.
        /// </summary>
        /// <returns type="Object">
        /// The extended base object.
        /// </returns>
        var base = arguments[0];
        for (var i = 1; i < arguments.length; i++) {
            var obj = arguments[i] || {};
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    base[prop] = obj[prop];
                }
            }
        }
        return base;
    },

    /**
     * Concatenates two arrays into one ensuring that each item is only
     * included once in the final array.
     * Items in the arrays are compared on the DocID property.
     *
     * @param a1 First array to be concatenated.
     * @param a2 Second array to be concatenated.
     * 
     * @return An array where all items are unique.
     */
    concatUnique = mod.concatUnique = function (a1, a2) {
        var a = a1.concat(a2);
        for (var i = 0; i < a.length; ++i) {
            for (var j = i + 1; j < a.length; ++j) {
                if (a[i].docid && a[j].docid && a[i].docid === a[j].docid) {
                    a.splice(j--, 1);
                }
            }
        }

        return a;
    },

    indexBy = mod.indexBy = function (list, picker) {
        /// <summary>
        /// Indexes the list of objects by the value provided by the picker.
        /// </summary>
        /// <param name="list" type="Array">
        /// The list of objects to index.
        /// </param>
        /// <param name="picker" type="Function">
        /// A function which picks the value to index by.
        /// </param>
        /// <returns type="Object">
        /// The indexed objects.
        /// </returns>
        return aggregate(list, function (item, map) {
            return set(picker(item), item, map);
        }, {});
    };

    function base(accumulator, seed) {
        return function () {
            var args = toArray(arguments);
            return function () {
                return aggregate(args, bind(accumulator, toArray(arguments)), seed);
            };
        };
    }

    return mod;
}

var msf = bindMsFuncyMod({});

window.define && define(msf);

//
// Module: msg
//

define.names.push("msg");
define(["require", "exports", "../ext/msfuncy-0.9"], function(require, exports, _) {
    function assertValue(name, value) {
        if (!value) {
            throw new Error("Parameter " + name + " must be specified.");
        }
    }

    

    

    /**
    * Represents a message.
    */
    var Message = (function () {
        /**
        * Initializes a new instance of sharedData with the specified plugin
        * information and data.
        *
        * @param source The source of the message.
        * @param data The data the plugin wants to share.
        */
        function Message(type, source, data) {
            assertValue("dataId", type);
            assertValue("pluginInfo", source);
            assertValue("data", data);
            this._type = type;
            this._source = source;
            this._data = data;
        }
        /**
        * Get the message type.
        */
        Message.prototype.getType = function () {
            return this._type;
        };

        /**
        * Get the message source.
        */
        Message.prototype.getSource = function () {
            return this._source;
        };

        /**
        * Get the data that was shared.
        */
        Message.prototype.getData = function () {
            return this._data;
        };
        return Message;
    })();
    exports.Message = Message;

    

    exports.LogMessage = function (type, properties) {
        return {
            getLogMessageType: _.k(type),
            getTimestamp: _.k(new Date()),
            getProperties: _.k(properties),
            serialize: _.k(JSON.stringify(properties))
        };
    };

    exports.logMessage = exports.LogMessage;

    /**
    * Common message types.
    */
    var MessageTypes = (function () {
        function MessageTypes() {
        }
        MessageTypes.logMessage = "logMessage";

        MessageTypes.errorMessage = "errorMessage";

        MessageTypes.relatedPeopleMessage = "relatedPeopleMessage";

        MessageTypes.sitesIFollowMessage = "SitesIFollowData";
        return MessageTypes;
    })();
    exports.MessageTypes = MessageTypes;

    
});

//
// Module: ../ext/rx
//

define.names.push("../ext/rx");
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.txt in the project root for license information.

var Rx;
(function (window, undefined) {
    var freeExports = typeof exports == 'object' && exports &&
        (typeof global == 'object' && global && global == global.global && (window = global), exports);

    var root = { Internals: {} };
    
    // Defaults
    function noop() { }
    function identity(x) { return x; }
    function defaultNow() { return new Date().getTime(); }
    function defaultComparer(x, y) { return x === y; }
    function defaultSubComparer(x, y) { return x - y; }
    function defaultKeySerializer(x) { return x.toString(); }
    function defaultError(err) { throw err; }

    // Errors
    var sequenceContainsNoElements = 'Sequence contains no elements.';
    var argumentOutOfRange = 'Argument out of range';
    var objectDisposed = 'Object has been disposed';
    function checkDisposed() {
        if (this.isDisposed) {
            throw new Error(objectDisposed);
        }
    }
    
    // Utilities
    if (!Function.prototype.bind) {
        Function.prototype.bind = function (that) {
            var target = this,
                args = slice.call(arguments, 1);
            var bound = function () {
                if (this instanceof bound) {
                    function F() { }
                    F.prototype = target.prototype;
                    var self = new F();
                    var result = target.apply(self, args.concat(slice.call(arguments)));
                    if (Object(result) === result) {
                        return result;
                    }
                    return self;
                } else {
                    return target.apply(that, args.concat(slice.call(arguments)));
                }
            };

            return bound;
        };
    }
    var slice = Array.prototype.slice;
    function argsOrArray(args, idx) {
        return args.length === 1 && Array.isArray(args[idx]) ?
            args[idx] :
            slice.call(args);
    }
    var hasProp = {}.hasOwnProperty;
    var inherits = root.Internals.inherits = function (child, parent) {
        for (var key in parent) { // Enumerable bug in WebKit Mobile 4.0
            if (key !== 'prototype' && hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() { this.constructor = child; }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.super_ = parent.prototype;
        return child;
    };
    var addProperties = root.Internals.addProperties = function (obj) {
        var sources = slice.call(arguments, 1);
        for (var i = 0, len = sources.length; i < len; i++) {
            var source = sources[i];
            for (var prop in source) {
                obj[prop] = source[prop];
            }
        }
    };

    // Rx Utils
    var addRef = root.Internals.addRef = function (xs, r) {
        return new AnonymousObservable(function (observer) {
            return new CompositeDisposable(r.getDisposable(), xs.subscribe(observer));
        });
    };

    // Collection polyfills
    var arrayInitialize = root.Internals.arrayInitialize = function (count, factory) {
        var a = new Array(count);
        for (var i = 0; i < count; i++) {
            a[i] = factory();
        }
        return a;
    }
    if (!Array.prototype.every) {
        Array.prototype.every = function (predicate) {
            var t = Object(this);
            for (var i = 0, len = t.length >>> 0; i < len; i++) {
                if (i in t && !predicate.call(arguments[1], t[i], i, t)) {
                    return false;
                }
            }
            return true;
        };
    }
    if (!Array.prototype.map) {
        Array.prototype.map = function (fun /*, thisArg */) {
            "use strict";

            if (this === void 0 || this === null)
                throw new TypeError();

            var t = Object(this);
            var len = t.length >>> 0;
            if (typeof fun !== "function")
                throw new TypeError();

            var res = new Array(len);
            var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
            for (var i = 0; i < len; i++) {
                // NOTE: Absolute correctness would demand Object.defineProperty
                //       be used.  But this method is fairly new, and failure is
                //       possible only if Object.prototype or Array.prototype
                //       has a property |i| (very unlikely), so use a less-correct
                //       but more portable alternative.
                if (i in t)
                    res[i] = fun.call(thisArg, t[i], i, t);
            }

            return res;
        };
    }
    if (!Array.prototype.filter) {
        Array.prototype.filter = function (predicate) {
            var results = [], item, t = new Object(this);
            for (var i = 0, len = t.length >>> 0; i < len; i++) {
                item = t[i];
                if (i in t && predicate.call(arguments[1], item, i, t)) {
                    results.push(item);
                }
            }
            return results;
        };
    }
    if (!Array.isArray) {
        Array.isArray = function (arg) {
            return Object.prototype.toString.call(arg) == '[object Array]';
        };
    }
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function indexOf(searchElement) {
            var t = Object(this);
            var len = t.length >>> 0;
            if (len === 0) {
                return -1;
            }
            var n = 0;
            if (arguments.length > 1) {
                n = Number(arguments[1]);
                if (n != n) {
                    n = 0;
                } else if (n != 0 && n != Infinity && n != -Infinity) {
                    n = (n > 0 || -1) * Math.floor(Math.abs(n));
                }
            }
            if (n >= len) {
                return -1;
            }
            var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
            for (; k < len; k++) {
                if (k in t && t[k] === searchElement) {
                    return k;
                }
            }
            return -1;
        };
    }

    // Collections
    var IndexedItem = function (id, value) {
        this.id = id;
        this.value = value;
    };

    IndexedItem.prototype.compareTo = function (other) {
        var c = this.value.compareTo(other.value);
        if (c === 0) {
            c = this.id - other.id;
        }
        return c;
    };

    // Priority Queue for Scheduling
    var PriorityQueue = function (capacity) {
        this.items = new Array(capacity);
        this.length = 0;
    };
    var priorityProto = PriorityQueue.prototype;
    priorityProto.isHigherPriority = function (left, right) {
        return this.items[left].compareTo(this.items[right]) < 0;
    };
    priorityProto.percolate = function (index) {
        if (index >= this.length || index < 0) {
            return;
        }
        var parent = index - 1 >> 1;
        if (parent < 0 || parent === index) {
            return;
        }
        if (this.isHigherPriority(index, parent)) {
            var temp = this.items[index];
            this.items[index] = this.items[parent];
            this.items[parent] = temp;
            this.percolate(parent);
        }
    };
    priorityProto.heapify = function (index) {
        if (index === undefined) {
            index = 0;
        }
        if (index >= this.length || index < 0) {
            return;
        }
        var left = 2 * index + 1,
            right = 2 * index + 2,
            first = index;
        if (left < this.length && this.isHigherPriority(left, first)) {
            first = left;
        }
        if (right < this.length && this.isHigherPriority(right, first)) {
            first = right;
        }
        if (first !== index) {
            var temp = this.items[index];
            this.items[index] = this.items[first];
            this.items[first] = temp;
            this.heapify(first);
        }
    };
    priorityProto.peek = function () {
        return this.items[0].value;
    };
    priorityProto.removeAt = function (index) {
        this.items[index] = this.items[--this.length];
        delete this.items[this.length];
        this.heapify();
    };
    priorityProto.dequeue = function () {
        var result = this.peek();
        this.removeAt(0);
        return result;
    };
    priorityProto.enqueue = function (item) {
        var index = this.length++;
        this.items[index] = new IndexedItem(PriorityQueue.count++, item);
        this.percolate(index);
    };
    priorityProto.remove = function (item) {
        for (var i = 0; i < this.length; i++) {
            if (this.items[i].value === item) {
                this.removeAt(i);
                return true;
            }
        }
        return false;
    };
    PriorityQueue.count = 0;
    /**
     * @constructor
     * Represents a group of disposable resources that are disposed together.
     */
    var CompositeDisposable = root.CompositeDisposable = function () {
        this.disposables = argsOrArray(arguments, 0);
        this.isDisposed = false;
        this.length = this.disposables.length;
    };

    /**
     *  Adds a disposable to the CompositeDisposable or disposes the disposable if the CompositeDisposable is disposed.
     *  
     *  @param item Disposable to add.
     */    
    CompositeDisposable.prototype.add = function (item) {
        if (this.isDisposed) {
            item.dispose();
        } else {
            this.disposables.push(item);
            this.length++;
        }
    };

    /**
     *  Removes and disposes the first occurrence of a disposable from the CompositeDisposable.
     *  
     *  @param item Disposable to remove.
     *  @return true if found; false otherwise.
     */
    CompositeDisposable.prototype.remove = function (item) {
        var shouldDispose = false;
        if (!this.isDisposed) {
            var idx = this.disposables.indexOf(item);
            if (idx !== -1) {
                shouldDispose = true;
                this.disposables.splice(idx, 1);
                this.length--;
                item.dispose();
            }

        }
        return shouldDispose;
    };

    /**
     *  Disposes all disposables in the group and removes them from the group.
     */
    CompositeDisposable.prototype.dispose = function () {
        if (!this.isDisposed) {
            this.isDisposed = true;
            var currentDisposables = this.disposables.slice(0);
            this.disposables = [];
            this.length = 0;

            for (var i = 0, len = currentDisposables.length; i < len; i++) {
                currentDisposables[i].dispose();
            }
        }
    };

    /**
     *  Removes and disposes all disposables from the CompositeDisposable, but does not dispose the CompositeDisposable.
     */   
    CompositeDisposable.prototype.clear = function () {
        var currentDisposables = this.disposables.slice(0);
        this.disposables = [];
        this.length = 0;
        for (var i = 0, len = currentDisposables.length; i < len; i++) {
            currentDisposables[i].dispose();
        }
    };

    /**
     *  Determines whether the CompositeDisposable contains a specific disposable.
     *  
     *  @param item Disposable to search for.
     *  @return true if the disposable was found; otherwise, false.
     */    
    CompositeDisposable.prototype.contains = function (item) {
        return this.disposables.indexOf(item) !== -1;
    };

    /**
     *  Converts the existing CompositeDisposable to an array of disposables
     *  
     *  @return An array of disposable objects.
     */  
    CompositeDisposable.prototype.toArray = function () {
        return this.disposables.slice(0);
    };
    
    /**
     * @constructor
     * Provides a set of static methods for creating Disposables.
     * @param dispose Action to run during the first call to dispose. The action is guaranteed to be run at most once.
     */
    var Disposable = root.Disposable = function (action) {
        this.isDisposed = false;
        this.action = action;
    };

    /** Performs the task of cleaning up resources. */     
    Disposable.prototype.dispose = function () {
        if (!this.isDisposed) {
            this.action();
            this.isDisposed = true;
        }
    };

    /**
     *  Creates a disposable object that invokes the specified action when disposed.
     *  
     *  @param dispose Action to run during the first call to dispose. The action is guaranteed to be run at most once.
     *  @return The disposable object that runs the given action upon disposal.
     */
    var disposableCreate = Disposable.create = function (action) { return new Disposable(action); };

    /** Gets the disposable that does nothing when disposed. */
    var disposableEmpty = Disposable.empty = { dispose: noop };

    /**
     * @constructor
     *  Represents a disposable resource which only allows a single assignment of its underlying disposable resource.
     *  If an underlying disposable resource has already been set, future attempts to set the underlying disposable resource will throw an Error.
     */
    var SingleAssignmentDisposable = root.SingleAssignmentDisposable = function () {
        this.isDisposed = false;
        this.current = null;
    };

    /**
     *  Gets or sets the underlying disposable. After disposal, the result of getting this method is undefined.
     *  
     *  @param [value] The new underlying disposable.
     *  @return The underlying disposable.
     */
    SingleAssignmentDisposable.prototype.disposable = function (value) {
        return !value ? this.getDisposable() : this.setDisposable(value);
    };

    /**
     *  Gets the underlying disposable. After disposal, the result of getting this method is undefined.
     *  @return The underlying disposable.
     */  
    SingleAssignmentDisposable.prototype.getDisposable = function () {
        return this.current;
    };

    /**
     *  Sets the underlying disposable. 
     *  @param value The new underlying disposable.
     */
    SingleAssignmentDisposable.prototype.setDisposable = function (value) {
        if (this.current) {
            throw new Error('Disposable has already been assigned');
        }
        var shouldDispose = this.isDisposed;
        if (!shouldDispose) {
            this.current = value;
        }
        if (shouldDispose && value) {
            value.dispose();
        }
    };

    /** Disposes the underlying disposable. */   
    SingleAssignmentDisposable.prototype.dispose = function () {
        var old;
        if (!this.isDisposed) {
            this.isDisposed = true;
            old = this.current;
            this.current = null;
        }
        if (old) {
            old.dispose();
        }
    };

    /**
     * @constructor
     * Represents a disposable resource whose underlying disposable resource can be replaced by another disposable resource, causing automatic disposal of the previous underlying disposable resource.
     */
    var SerialDisposable = root.SerialDisposable = function () {
        this.isDisposed = false;
        this.current = null;
    };

    /**
     * Gets the underlying disposable.
     * @return The underlying disposable</returns>
     */
    SerialDisposable.prototype.getDisposable = function () {
        return this.current;
    };

    /**
     * Sets the underlying disposable.
     * @param value The new underlying disposable.
     */  
    SerialDisposable.prototype.setDisposable = function (value) {
        var shouldDispose = this.isDisposed, old;
        if (!shouldDispose) {
            old = this.current;
            this.current = value;
        }
        if (old) {
            old.dispose();
        }
        if (shouldDispose && value) {
            value.dispose();
        }
    };

    /**
     * Gets or sets the underlying disposable.
     * If the SerialDisposable has already been disposed, assignment to this property causes immediate disposal of the given disposable object. Assigning this property disposes the previous disposable object.
     */    
    SerialDisposable.prototype.disposable = function (value) {
        if (!value) {
            return this.getDisposable();
        } else {
            this.setDisposable(value);
        }
    };

    /** Disposes the underlying disposable as well as all future replacements. */   
    SerialDisposable.prototype.dispose = function () {
        var old;
        if (!this.isDisposed) {
            this.isDisposed = true;
            old = this.current;
            this.current = null;
        }
        if (old) {
            old.dispose();
        }
    };

    /**
     * Represents a disposable resource that only disposes its underlying disposable resource when all <see cref="GetDisposable">dependent disposable objects</see> have been disposed.
     */  
    var RefCountDisposable = root.RefCountDisposable = (function () {

        function InnerDisposable(disposable) {
            this.disposable = disposable;
            this.disposable.count++;
            this.isInnerDisposed = false;
        }

        InnerDisposable.prototype.dispose = function () {
            if (!this.disposable.isDisposed) {
                if (!this.isInnerDisposed) {
                    this.isInnerDisposed = true;
                    this.disposable.count--;
                    if (this.disposable.count === 0 && this.disposable.isPrimaryDisposed) {
                        this.disposable.isDisposed = true;
                        this.disposable.underlyingDisposable.dispose();
                    }
                }
            }
        };

        /**
         * Initializes a new instance of the RefCountDisposable with the specified disposable.
         * @param disposable Underlying disposable.
          */
        function RefCountDisposable(disposable) {
            this.underlyingDisposable = disposable;
            this.isDisposed = false;
            this.isPrimaryDisposed = false;
            this.count = 0;
        }

        /** Disposes the underlying disposable only when all dependent disposables have been disposed */
        RefCountDisposable.prototype.dispose = function () {
            if (!this.isDisposed) {
                if (!this.isPrimaryDisposed) {
                    this.isPrimaryDisposed = true;
                    if (this.count === 0) {
                        this.isDisposed = true;
                        this.underlyingDisposable.dispose();
                    }
                }
            }
        };

        /**
         * Returns a dependent disposable that when disposed decreases the refcount on the underlying disposable.
         * @return A dependent disposable contributing to the reference count that manages the underlying disposable's lifetime.H
         */        
        RefCountDisposable.prototype.getDisposable = function () {
            return this.isDisposed ? disposableEmpty : new InnerDisposable(this);
        };

        return RefCountDisposable;
    })();

    function ScheduledDisposable(scheduler, disposable) {
        this.scheduler = scheduler, this.disposable = disposable, this.isDisposed = false;
    }
    ScheduledDisposable.prototype.dispose = function () {
        var parent = this;
        this.scheduler.schedule(function () {
            if (!parent.isDisposed) {
                parent.isDisposed = true;
                parent.disposable.dispose();
            }
        });
    };

    function ScheduledItem(scheduler, state, action, dueTime, comparer) {
        this.scheduler = scheduler;
        this.state = state;
        this.action = action;
        this.dueTime = dueTime;
        this.comparer = comparer || defaultSubComparer;
        this.disposable = new SingleAssignmentDisposable();
    }
    ScheduledItem.prototype.invoke = function () {
        this.disposable.disposable(this.invokeCore());
    };
    ScheduledItem.prototype.compareTo = function (other) {
        return this.comparer(this.dueTime, other.dueTime);
    };
    ScheduledItem.prototype.isCancelled = function () {
        return this.disposable.isDisposed;
    };
    ScheduledItem.prototype.invokeCore = function () {
        return this.action(this.scheduler, this.state);
    };

    /** Provides a set of static properties to access commonly used schedulers. */
    var Scheduler = root.Scheduler = (function () {

        /** @constructor */
        function Scheduler(now, schedule, scheduleRelative, scheduleAbsolute) {
            this.now = now;
            this._schedule = schedule;
            this._scheduleRelative = scheduleRelative;
            this._scheduleAbsolute = scheduleAbsolute;
        }

        function invokeRecImmediate(scheduler, pair) {
            var state = pair.first, action = pair.second, group = new CompositeDisposable(),
            recursiveAction = function (state1) {
                action(state1, function (state2) {
                    var isAdded = false, isDone = false,
                    d = scheduler.scheduleWithState(state2, function (scheduler1, state3) {
                        if (isAdded) {
                            group.remove(d);
                        } else {
                            isDone = true;
                        }
                        recursiveAction(state3);
                        return disposableEmpty;
                    });
                    if (!isDone) {
                        group.add(d);
                        isAdded = true;
                    }
                });
            };
            recursiveAction(state);
            return group;
        }

        function invokeRecDate(scheduler, pair, method) {
            var state = pair.first, action = pair.second, group = new CompositeDisposable(),
            recursiveAction = function (state1) {
                action(state1, function (state2, dueTime1) {
                    var isAdded = false, isDone = false,
                    d = scheduler[method].call(scheduler, state2, dueTime1, function (scheduler1, state3) {
                        if (isAdded) {
                            group.remove(d);
                        } else {
                            isDone = true;
                        }
                        recursiveAction(state3);
                        return disposableEmpty;
                    });
                    if (!isDone) {
                        group.add(d);
                        isAdded = true;
                    }
                });
            };
            recursiveAction(state);
            return group;
        }

        function invokeAction(scheduler, action) {
            action();
            return disposableEmpty;
        }

        var schedulerProto = Scheduler.prototype;

        /**
         * Returns a scheduler that wraps the original scheduler, adding exception handling for scheduled actions.
         * 
         * @param scheduler Scheduler to apply an exception filter for.
         * @param handler Handler that's run if an exception is caught. The exception will be rethrown if the handler returns false.
         * @return Wrapper around the original scheduler, enforcing exception handling.
         */        
        schedulerProto.catchException = function (handler) {
            return new CatchScheduler(this, handler);
        };
        
        /**
         * Schedules a periodic piece of work by dynamically discovering the scheduler's capabilities. The periodic task will be scheduled using window.setInterval for the base implementation.
         * 
         * @param period Period for running the work periodically.
         * @param action Action to be executed.
         * @return The disposable object used to cancel the scheduled recurring action (best effort).
         */        
        schedulerProto.schedulePeriodic = function (period, action) {
            return this.schedulePeriodicWithState(null, period, function () {
                action();
            });
        };

        /**
         * Schedules a periodic piece of work by dynamically discovering the scheduler's capabilities. The periodic task will be scheduled using window.setInterval for the base implementation.
         * 
         * @param state Initial state passed to the action upon the first iteration.
         * @param period Period for running the work periodically.
         * @param action Action to be executed, potentially updating the state.
         * @return The disposable object used to cancel the scheduled recurring action (best effort).
         */
        schedulerProto.schedulePeriodicWithState = function (state, period, action) {
            var s = state, id = window.setInterval(function () {
                s = action(s);
            }, period);
            return disposableCreate(function () {
                window.clearInterval(id);
            });
        };

        /**
         * Schedules an action to be executed.
         * 
         * @param action Action to execute.
         * @return The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.schedule = function (action) {
            return this._schedule(action, invokeAction);
        };

        /**
         * Schedules an action to be executed.
         * 
         * @param state State passed to the action to be executed.
         * @param action Action to be executed.
         * @return The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleWithState = function (state, action) {
            return this._schedule(state, action);
        };

        /**
         * Schedules an action to be executed after the specified relative due time.
         * 
         * @param action Action to execute.
         * @param dueTime Relative time after which to execute the action.
         * @return The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleWithRelative = function (dueTime, action) {
            return this._scheduleRelative(action, dueTime, invokeAction);
        };

        /**
         * Schedules an action to be executed after dueTime.
         * 
         * @param state State passed to the action to be executed.
         * @param action Action to be executed.
         * @param dueTime Relative time after which to execute the action.
         * @return The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleWithRelativeAndState = function (state, dueTime, action) {
            return this._scheduleRelative(state, dueTime, action);
        };

        /**
         * Schedules an action to be executed at the specified absolute due time.
         * 
         * @param action Action to execute.
         * @param dueTime Absolute time at which to execute the action.
         * @return The disposable object used to cancel the scheduled action (best effort).
          */
        schedulerProto.scheduleWithAbsolute = function (dueTime, action) {
            return this._scheduleAbsolute(action, dueTime, invokeAction);
        };

        /**
         * Schedules an action to be executed at dueTime.
         * 
         * @param state State passed to the action to be executed.
         * @param action Action to be executed.
         * @param dueTime Absolute time at which to execute the action.
         * @return The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleWithAbsoluteAndState = function (state, dueTime, action) {
            return this._scheduleAbsolute(state, dueTime, action);
        };

        /**
         * Schedules an action to be executed recursively.
         * 
         * @param action Action to execute recursively. The parameter passed to the action is used to trigger recursive scheduling of the action.
         * @return The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleRecursive = function (action) {
            return this.scheduleRecursiveWithState(action, function (_action, self) {
                _action(function () {
                    self(_action);
                });
            });
        };

        /**
         * Schedules an action to be executed recursively.
         * 
         * @param state State passed to the action to be executed.
         * @param action Action to execute recursively. The last parameter passed to the action is used to trigger recursive scheduling of the action, passing in recursive invocation state.
         * @return The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleRecursiveWithState = function (state, action) {
            return this.scheduleWithState({ first: state, second: action }, function (s, p) {
                return invokeRecImmediate(s, p);
            });
        };

        /**
         * Schedules an action to be executed recursively after a specified relative due time.
         * 
         * @param action Action to execute recursively. The parameter passed to the action is used to trigger recursive scheduling of the action at the specified relative time.
         * @param dueTime Relative time after which to execute the action for the first time.
         * @return The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleRecursiveWithRelative = function (dueTime, action) {
            return this.scheduleRecursiveWithRelativeAndState(action, dueTime, function (_action, self) {
                _action(function (dt) {
                    self(_action, dt);
                });
            });
        };

        /**
         * Schedules an action to be executed recursively after a specified relative due time.
         * 
         * @param state State passed to the action to be executed.
         * @param action Action to execute recursively. The last parameter passed to the action is used to trigger recursive scheduling of the action, passing in the recursive due time and invocation state.
         * @param dueTime Relative time after which to execute the action for the first time.
         * @return The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleRecursiveWithRelativeAndState = function (state, dueTime, action) {
            return this._scheduleRelative({ first: state, second: action }, dueTime, function (s, p) {
                return invokeRecDate(s, p, 'scheduleWithRelativeAndState');
            });
        };

        /**
         * Schedules an action to be executed recursively at a specified absolute due time.
         * 
         * @param action Action to execute recursively. The parameter passed to the action is used to trigger recursive scheduling of the action at the specified absolute time.
         * @param dueTime Absolute time at which to execute the action for the first time.
         * @return The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleRecursiveWithAbsolute = function (dueTime, action) {
            return this.scheduleRecursiveWithAbsoluteAndState(action, dueTime, function (_action, self) {
                _action(function (dt) {
                    self(_action, dt);
                });
            });
        };

        /**
         * Schedules an action to be executed recursively at a specified absolute due time.
         * 
         * @param state State passed to the action to be executed.
         * @param action Action to execute recursively. The last parameter passed to the action is used to trigger recursive scheduling of the action, passing in the recursive due time and invocation state.
         * @param dueTime Absolute time at which to execute the action for the first time.
         * @return The disposable object used to cancel the scheduled action (best effort).
         */
        schedulerProto.scheduleRecursiveWithAbsoluteAndState = function (state, dueTime, action) {
            return this._scheduleAbsolute({ first: state, second: action }, dueTime, function (s, p) {
                return invokeRecDate(s, p, 'scheduleWithAbsoluteAndState');
            });
        };

        /** Gets the current time according to the local machine's system clock. */
        Scheduler.now = defaultNow;

        /**
         * Normalizes the specified TimeSpan value to a positive value.
         * 
         * @param {Number} timeSpan The time span value to normalize.
         * @return The specified TimeSpan value if it is zero or positive; otherwise, 0
         */   
        Scheduler.normalize = function (timeSpan) {
            if (timeSpan < 0) {
                timeSpan = 0;
            }
            return timeSpan;
        };

        return Scheduler;
    }());
    
    // Immediate Scheduler
    var schedulerNoBlockError = 'Scheduler is not allowed to block the thread';
    var immediateScheduler = Scheduler.immediate = (function () {

        function scheduleNow(state, action) {
            return action(this, state);
        }

        function scheduleRelative(state, dueTime, action) {
            if (dueTime > 0) throw new Error(schedulerNoBlockError);
            return action(this, state);
        }

        function scheduleAbsolute(state, dueTime, action) {
            return this.scheduleWithRelativeAndState(state, dueTime - this.now(), action);
        }

        return new Scheduler(defaultNow, scheduleNow, scheduleRelative, scheduleAbsolute);
    }());

    // Current Thread Scheduler
    var currentThreadScheduler = Scheduler.currentThread = (function () {
        var queue;

        function Trampoline() {
            queue = new PriorityQueue(4);
        }

        Trampoline.prototype.dispose = function () {
            queue = null;
        };

        Trampoline.prototype.run = function () {
            var item;
            while (queue.length > 0) {
                item = queue.dequeue();
                if (!item.isCancelled()) {
                    while (item.dueTime - Scheduler.now() > 0) {
                    }
                    if (!item.isCancelled()) {
                        item.invoke();
                    }
                }
            }
        };

        function scheduleNow(state, action) {
            return this.scheduleWithRelativeAndState(state, 0, action);
        }

        function scheduleRelative(state, dueTime, action) {
            var dt = this.now() + Scheduler.normalize(dueTime),
                    si = new ScheduledItem(this, state, action, dt),
                    t;
            if (!queue) {
                t = new Trampoline();
                try {
                    queue.enqueue(si);
                    t.run();
                } finally {
                    t.dispose();
                }
            } else {
                queue.enqueue(si);
            }
            return si.disposable;
        }

        function scheduleAbsolute(state, dueTime, action) {
            return this.scheduleWithRelativeAndState(state, dueTime - this.now(), action);
        }

        var currentScheduler = new Scheduler(defaultNow, scheduleNow, scheduleRelative, scheduleAbsolute);
        currentScheduler.scheduleRequired = function () { return queue === null; };
        currentScheduler.ensureTrampoline = function (action) {
            if (queue === null) {
                return this.schedule(action);
            } else {
                return action();
            }
        };

        return currentScheduler;
    }());

    var SchedulePeriodicRecursive = (function () {
        function tick(command, recurse) {
            recurse(0, this._period);
            try {
                this._state = this._action(this._state);
            } catch (e) {
                this._cancel.dispose();
                throw e;
            }
        }

        function SchedulePeriodicRecursive(scheduler, state, period, action) {
            this._scheduler = scheduler;
            this._state = state;
            this._period = period;
            this._action = action;
        }

        SchedulePeriodicRecursive.prototype.start = function () {
            var d = new SingleAssignmentDisposable();
            this._cancel = d;
            d.setDisposable(this._scheduler.scheduleRecursiveWithRelativeAndState(0, this._period, tick.bind(this)));

            return d;
        };

        return SchedulePeriodicRecursive;
    }());

    /** Provides a set of extension methods for virtual time scheduling. */
    root.VirtualTimeScheduler = (function () {

        function localNow() {
            return this.toDateTimeOffset(this.clock);
        }

        function scheduleNow(state, action) {
            return this.scheduleAbsoluteWithState(state, this.clock, action);
        }

        function scheduleRelative(state, dueTime, action) {
            return this.scheduleRelativeWithState(state, this.toRelative(dueTime), action);
        }

        function scheduleAbsolute(state, dueTime, action) {
            return this.scheduleRelativeWithState(state, this.toRelative(dueTime - this.now()), action);
        }

        function invokeAction(scheduler, action) {
            action();
            return disposableEmpty;
        }

        inherits(VirtualTimeScheduler, Scheduler);

        /**
         * Creates a new virtual time scheduler with the specified initial clock value and absolute time comparer.
         * @param initialClock Initial value for the clock.
         * @param comparer Comparer to determine causality of events based on absolute time.
         */
        function VirtualTimeScheduler(initialClock, comparer) {
            this.clock = initialClock;
            this.comparer = comparer;
            this.isEnabled = false;
            this.queue = new PriorityQueue(1024);
            VirtualTimeScheduler.super_.constructor.call(this, localNow, scheduleNow, scheduleRelative, scheduleAbsolute);
        }

        addProperties(VirtualTimeScheduler.prototype, {
            /**
             * Schedules a periodic piece of work by dynamically discovering the scheduler's capabilities. The periodic task will be emulated using recursive scheduling.
             * 
             * @param state Initial state passed to the action upon the first iteration.
             * @param period Period for running the work periodically.
             * @param action Action to be executed, potentially updating the state.
             * @return The disposable object used to cancel the scheduled recurring action (best effort).
             */      
            schedulePeriodicWithState: function (state, period, action) {
                var s = new SchedulePeriodicRecursive(this, state, period, action);
                return s.start();
            },
            /**
             * Schedules an action to be executed after dueTime.
             * 
             * @param state State passed to the action to be executed.
             * @param dueTime Relative time after which to execute the action.
             * @param action Action to be executed.
             * @return The disposable object used to cancel the scheduled action (best effort).
             */            
            scheduleRelativeWithState: function (state, dueTime, action) {
                var runAt = this.add(this.clock, dueTime);
                return this.scheduleAbsoluteWithState(state, runAt, action);
            },
            /**
             * Schedules an action to be executed at dueTime.
             * 
             * @param dueTime Relative time after which to execute the action.
             * @param action Action to be executed.
             * @return The disposable object used to cancel the scheduled action (best effort).
             */          
            scheduleRelative: function (dueTime, action) {
                return this.scheduleRelativeWithState(action, dueTime, invokeAction);
            },
            /** Starts the virtual time scheduler. */
            start: function () {
                var next;
                if (!this.isEnabled) {
                    this.isEnabled = true;
                    do {
                        next = this.getNext();
                        if (next !== null) {
                            if (this.comparer(next.dueTime, this.clock) > 0) {
                                this.clock = next.dueTime;
                            }
                            next.invoke();
                        } else {
                            this.isEnabled = false;
                        }
                    } while (this.isEnabled);
                }
            },
            /** Stops the virtual time scheduler. */
            stop: function () {
                this.isEnabled = false;
            },
            /**
             * Advances the scheduler's clock to the specified time, running all work till that point.
             * @param time Absolute time to advance the scheduler's clock to.
             */
            advanceTo: function (time) {
                var next;
                var dueToClock = this.comparer(this.clock, time);
                if (this.comparer(this.clock, time) > 0) {
                    throw new Error(argumentOutOfRange);
                }
                if (dueToClock === 0) {
                    return;
                }
                if (!this.isEnabled) {
                    this.isEnabled = true;
                    do {
                        next = this.getNext();
                        if (next !== null && this.comparer(next.dueTime, time) <= 0) {
                            if (this.comparer(next.dueTime, this.clock) > 0) {
                                this.clock = next.dueTime;
                            }
                            next.invoke();
                        } else {
                            this.isEnabled = false;
                        }
                    } while (this.isEnabled)
                    this.clock = time;
                }
            },
            /**
             * Advances the scheduler's clock by the specified relative time, running all work scheduled for that timespan.
             * @param time Relative time to advance the scheduler's clock by.
             */
            advanceBy: function (time) {
                var dt = this.add(this.clock, time);
                var dueToClock = this.comparer(this.clock, dt);
                if (dueToClock > 0) {
                    throw new Error(argumentOutOfRange);
                }
                if (dueToClock === 0) {
                    return;
                }
                return this.advanceTo(dt);
            },
            /**
             * Advances the scheduler's clock by the specified relative time.
             * @param time Relative time to advance the scheduler's clock by.
             */
            sleep: function (time) {
                var dt = this.add(this.clock, time);

                if (this.comparer(this.clock, dt) >= 0) {
                    throw new Error(argumentOutOfRange);
                }

                this.clock = dt;
            },
            /**
             * Gets the next scheduled item to be executed.
             * @return The next scheduled item.
             */          
            getNext: function () {
                var next;
                while (this.queue.length > 0) {
                    next = this.queue.peek();
                    if (next.isCancelled()) {
                        this.queue.dequeue();
                    } else {
                        return next;
                    }
                }
                return null;
            },
            /**
             * Schedules an action to be executed at dueTime.
             * @param scheduler Scheduler to execute the action on.
             * @param dueTime Absolute time at which to execute the action.
             * @param action Action to be executed.
             * @return The disposable object used to cancel the scheduled action (best effort).
             */           
            scheduleAbsolute: function (dueTime, action) {
                return this.scheduleAbsoluteWithState(action, dueTime, invokeAction);
            },
            /**
             * Schedules an action to be executed at dueTime.
             * @param state State passed to the action to be executed.
             * @param dueTime Absolute time at which to execute the action.
             * @param action Action to be executed.
             * @return The disposable object used to cancel the scheduled action (best effort).
             */
            scheduleAbsoluteWithState: function (state, dueTime, action) {
                var self = this,
                    run = function (scheduler, state1) {
                        self.queue.remove(si);
                        return action(scheduler, state1);
                    },
                    si = new ScheduledItem(self, state, run, dueTime, self.comparer);
                self.queue.enqueue(si);
                return si.disposable;
            }
        });

        return VirtualTimeScheduler;
    }());

    /** Provides a virtual time scheduler that uses Date for absolute time and number for relative time. */
    root.HistoricalScheduler = (function () {
        inherits(HistoricalScheduler, root.VirtualTimeScheduler);

        /**
         * @constructor
         * Creates a new historical scheduler with the specified initial clock value.
         * 
         * @param initialClock Initial value for the clock.
         * @param comparer Comparer to determine causality of events based on absolute time.
         */
        function HistoricalScheduler(initialClock, comparer) {
            var clock = initialClock == null ? 0 : initialClock;
            var cmp = comparer || defaultSubComparer;
            HistoricalScheduler.super_.constructor.call(this, clock, cmp);
        }

        var HistoricalSchedulerProto = HistoricalScheduler.prototype;

        /**
         * Adds a relative time value to an absolute time value.
         * 
         * @param absolute Absolute virtual time value.
         * @param relative Relative virtual time value to add.
         * @return Resulting absolute virtual time sum value.
         */
        HistoricalSchedulerProto.add = function (absolute, relative) {
            return absolute + relative;
        };

        HistoricalSchedulerProto.toDateTimeOffset = function (absolute) {
            return new Date(absolute).getTime();
        };

        /**
         * Converts the TimeSpan value to a relative virtual time value.
         * 
         * @param timeSpan TimeSpan value to convert.
         * @return Corresponding relative virtual time value.
         */
        HistoricalSchedulerProto.toRelative = function (timeSpan) {
            return timeSpan;
        };

        return HistoricalScheduler;    
    }());
    // Timeout Scheduler
    var timeoutScheduler = Scheduler.timeout = (function () {

        // Optimize for speed
        var reqAnimFrame = window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame,
        clearAnimFrame = window.cancelAnimationFrame ||
            window.webkitCancelAnimationFrame ||
            window.mozCancelAnimationFrame ||
            window.oCancelAnimationFrame ||
            window.msCancelAnimationFrame;

        var scheduleMethod, clearMethod;
        if (typeof window.process !== 'undefined' && typeof window.process.nextTick === 'function') {
            scheduleMethod = window.process.nextTick;
            clearMethod = noop;
        } else if (typeof window.setImmediate === 'function') {
            scheduleMethod = window.setImmediate;
            clearMethod = window.clearImmediate;
        } else if (typeof reqAnimFrame === 'function') {
            scheduleMethod = reqAnimFrame;
            clearMethod = clearAnimFrame;
        } else {
            scheduleMethod = function (action) { return window.setTimeout(action, 0); };
            clearMethod = window.clearTimeout;
        }

        function scheduleNow(state, action) {
            var scheduler = this;
            var disposable = new SingleAssignmentDisposable();
            var id = scheduleMethod(function () {
                disposable.setDisposable(action(scheduler, state));
            });
            return new CompositeDisposable(disposable, disposableCreate(function () {
                clearMethod(id);
            }));
        }

        function scheduleRelative(state, dueTime, action) {
            var scheduler = this;
            var dt = Scheduler.normalize(dueTime);
            if (dt === 0) {
                return scheduler.scheduleWithState(state, action);
            }
            var disposable = new SingleAssignmentDisposable();
            var id = window.setTimeout(function () {
                disposable.setDisposable(action(scheduler, state));
            }, dt);
            return new CompositeDisposable(disposable, disposableCreate(function () {
                window.clearTimeout(id);
            }));
        }

        function scheduleAbsolute(state, dueTime, action) {
            return this.scheduleWithRelativeAndState(state, dueTime - this.now(), action);
        }

        return new Scheduler(defaultNow, scheduleNow, scheduleRelative, scheduleAbsolute);
    })();

    // CatchScheduler
    var CatchScheduler = (function () {

        function localNow() {
            return this._scheduler.now();
        }

        function scheduleNow(state, action) {
            return this._scheduler.scheduleWithState(state, this._wrap(action));
        }

        function scheduleRelative(state, dueTime, action) {
            return this._scheduler.scheduleWithRelativeAndState(state, dueTime, this._wrap(action));
        }

        function scheduleAbsolute(state, dueTime, action) {
            return this._scheduler.scheduleWithAbsoluteAndState(state, dueTime, this._wrap(action));
        }

        inherits(CatchScheduler, Scheduler);
        function CatchScheduler(scheduler, handler) {
            this._scheduler = scheduler;
            this._handler = handler;
            this._recursiveOriginal = null;
            this._recursiveWrapper = null;
            CatchScheduler.super_.constructor.call(this, localNow, scheduleNow, scheduleRelative, scheduleAbsolute);
        }

        CatchScheduler.prototype._clone = function (scheduler) {
            return new CatchScheduler(scheduler, this._handler);
        };

        CatchScheduler.prototype._wrap = function (action) {
            var parent = this;
            return function (self, state) {
                try {
                    return action(parent._getRecursiveWrapper(self), state);
                } catch (e) {
                    if (!parent._handler(e)) { throw e; }
                    return disposableEmpty;
                }
            };
        };

        CatchScheduler.prototype._getRecursiveWrapper = function (scheduler) {
            if (!this._recursiveOriginal !== scheduler) {
                this._recursiveOriginal = scheduler;
                var wrapper = this._clone(scheduler);
                wrapper._recursiveOriginal = scheduler;
                wrapper._recursiveWrapper = wrapper;
                this._recursiveWrapper = wrapper;
            }
            return this._recursiveWrapper;
        };

        CatchScheduler.prototype.schedulePeriodicWithState = function (state, period, action) {
            var self = this, failed = false, d = new SingleAssignmentDisposable();

            d.setDisposable(this._scheduler.schedulePeriodicWithState(state, period, function (state1) {
                if (failed) { return null; }
                try {
                    return action(state1);
                } catch (e) {
                    failed = true;
                    if (!self._handler(e)) { throw e; }
                    d.dispose();
                    return null;
                }
            }));

            return d;
        };

        return CatchScheduler;
    }());

    /**
     *  Represents a notification to an observer.
     */
    var Notification = root.Notification = (function () {
        function Notification() { }

        addProperties(Notification.prototype, {
            accept: function (observerOrOnNext, onError, onCompleted) {
                if (arguments.length > 1 || typeof observerOrOnNext === 'function') {
                    return this._accept(observerOrOnNext, onError, onCompleted);
                } else {
                    return this._acceptObservable(observerOrOnNext);
                }
            },
            toObservable: function (scheduler) {
                var notification = this;
                scheduler = scheduler || immediateScheduler;
                return new AnonymousObservable(function (observer) {
                    return scheduler.schedule(function () {
                        notification._acceptObservable(observer);
                        if (notification.kind === 'N') {
                            observer.onCompleted();
                        }
                    });
                });
            },
            hasValue: false,
            equals: function (other) {
                var otherString = other == null ? '' : other.toString();
                return this.toString() === otherString;
            }
        });

        return Notification;
    })();

    /**
     *  Creates an object that represents an OnNext notification to an observer.
     *  
     *  @param value The value contained in the notification.
     *  @return The OnNext notification containing the value.
     */
    var notificationCreateOnNext = Notification.createOnNext = (function () {
        inherits(ON, Notification);
        function ON(value) {
            this.value = value;
            this.hasValue = true;
            this.kind = 'N';
        }

        addProperties(ON.prototype, {
            _accept: function (onNext) {
                return onNext(this.value);
            },
            _acceptObservable: function (observer) {
                return observer.onNext(this.value);
            },
            toString: function () {
                return 'OnNext(' + this.value + ')';
            }
        });

        return function (next) {
            return new ON(next);
        };
    }());

    /**
     *  Creates an object that represents an OnError notification to an observer.
     *  
     *  @param error The exception contained in the notification.
     *  @return The OnError notification containing the exception.
     */
    var notificationCreateOnError = Notification.createOnError = (function () {
        inherits(OE, Notification);
        function OE(exception) {
            this.exception = exception;
            this.kind = 'E';
        }

        addProperties(OE.prototype, {
            _accept: function (onNext, onError) {
                return onError(this.exception);
            },
            _acceptObservable: function (observer) {
                return observer.onError(this.exception);
            },
            toString: function () {
                return 'OnError(' + this.exception + ')';
            }
        });

        return function (error) {
            return new OE(error);
        };
    }());

    /**
     *  Creates an object that represents an OnCompleted notification to an observer.
     *  @return The OnCompleted notification.
     */
    var notificationCreateOnCompleted = Notification.createOnCompleted = (function () {
        inherits(OC, Notification);
        function OC() {
            this.kind = 'C';
        }

        addProperties(OC.prototype, {
            _accept: function (onNext, onError, onCompleted) {
                return onCompleted();
            },
            _acceptObservable: function (observer) {
                return observer.onCompleted();
            },
            toString: function () {
                return 'OnCompleted()';
            }
        });

        return function () {
            return new OC();
        };
    }());

    // Enumerator

    var Enumerator = root.Internals.Enumerator = function (moveNext, getCurrent, dispose) {
        this.moveNext = moveNext;
        this.getCurrent = getCurrent;
        this.dispose = dispose;
    };
    var enumeratorCreate = Enumerator.create = function (moveNext, getCurrent, dispose) {
        var done = false;
        dispose || (dispose = noop);
        return new Enumerator(function () {
            if (done) {
                return false;
            }
            var result = moveNext();
            if (!result) {
                done = true;
                dispose();
            }
            return result;
        }, function () { return getCurrent(); }, function () {
            if (!done) {
                dispose();
                done = true;
            }
        });
    };
    
    // Enumerable
    var Enumerable = root.Internals.Enumerable = (function () {
        function Enumerable(getEnumerator) {
            this.getEnumerator = getEnumerator;
        }

        Enumerable.prototype.concat = function () {
            var sources = this;
            return new AnonymousObservable(function (observer) {
                var e = sources.getEnumerator(), isDisposed = false, subscription = new SerialDisposable();
                var cancelable = immediateScheduler.scheduleRecursive(function (self) {
                    var current, ex, hasNext = false;
                    if (!isDisposed) {
                        try {
                            hasNext = e.moveNext();
                            if (hasNext) {
                                current = e.getCurrent();
                            } else {
                                e.dispose();
                            }
                        } catch (exception) {
                            ex = exception;
                            e.dispose();
                        }
                    } else {
                        return;
                    }
                    if (ex) {
                        observer.onError(ex);
                        return;
                    }
                    if (!hasNext) {
                        observer.onCompleted();
                        return;
                    }
                    var d = new SingleAssignmentDisposable();
                    subscription.setDisposable(d);
                    d.setDisposable(current.subscribe(
                        observer.onNext.bind(observer),
                        observer.onError.bind(observer),
                        function () { self(); })
                    );
                });
                return new CompositeDisposable(subscription, cancelable, disposableCreate(function () {
                    isDisposed = true;
                    e.dispose();
                }));
            });
        };

        Enumerable.prototype.catchException = function () {
            var sources = this;
            return new AnonymousObservable(function (observer) {
                var e = sources.getEnumerator(), isDisposed = false, lastException;
                var subscription = new SerialDisposable();
                var cancelable = immediateScheduler.scheduleRecursive(function (self) {
                    var current, ex, hasNext;
                    hasNext = false;
                    if (!isDisposed) {
                        try {
                            hasNext = e.moveNext();
                            if (hasNext) {
                                current = e.getCurrent();
                            }
                        } catch (exception) {
                            ex = exception;
                        }
                    } else {
                        return;
                    }
                    if (ex) {
                        observer.onError(ex);
                        return;
                    }
                    if (!hasNext) {
                        if (lastException) {
                            observer.onError(lastException);
                        } else {
                            observer.onCompleted();
                        }
                        return;
                    }
                    var d = new SingleAssignmentDisposable();
                    subscription.setDisposable(d);
                    d.setDisposable(current.subscribe(
                        observer.onNext.bind(observer),
                        function (exn) {
                            lastException = exn;
                            self();
                        },
                        observer.onCompleted.bind(observer)));
                });
                return new CompositeDisposable(subscription, cancelable, disposableCreate(function () {
                    isDisposed = true;
                }));
            });
        };

        return Enumerable;
    }());

    // Enumerable properties
    var enumerableRepeat = Enumerable.repeat = function (value, repeatCount) {
        if (repeatCount === undefined) {
            repeatCount = -1;
        }
        return new Enumerable(function () {
            var current, left = repeatCount;
            return enumeratorCreate(function () {
                if (left === 0) {
                    return false;
                }
                if (left > 0) {
                    left--;
                }
                current = value;
                return true;
            }, function () { return current; });
        });
    };
    var enumerableFor = Enumerable.forEach = function (source, selector) {
        selector || (selector = identity);
        return new Enumerable(function () {
            var current, index = -1;
            return enumeratorCreate(
                function () {
                    if (++index < source.length) {
                        current = selector(source[index], index);
                        return true;
                    }
                    return false;
                },
                function () { return current; }
            );
        });
    };

    /**
     * Supports push-style iteration over an observable sequence.
     */
    var Observer = root.Observer = function () { };

    /**
     *  Creates a notification callback from an observer.
     *  
     *  @param observer Observer object.
     *  @return The action that forwards its input notification to the underlying observer.
     */
    Observer.prototype.toNotifier = function () {
        var observer = this;
        return function (n) {
            return n.accept(observer);
        };
    };

    /**
     *  Hides the identity of an observer.
     *  
     *  @param observer An observer whose identity to hide.
     *  @return An observer that hides the identity of the specified observer. 
     */   
    Observer.prototype.asObserver = function () {
        return new AnonymousObserver(this.onNext.bind(this), this.onError.bind(this), this.onCompleted.bind(this));
    };

    /**
     *  Checks access to the observer for grammar violations. This includes checking for multiple OnError or OnCompleted calls, as well as reentrancy in any of the observer methods.
     *  If a violation is detected, an Error is thrown from the offending observer method call.
     *  
     *  @param observer The observer whose callback invocations should be checked for grammar violations.
     *  @return An observer that checks callbacks invocations against the observer grammar and, if the checks pass, forwards those to the specified observer.
     */    
    Observer.prototype.checked = function () { return new CheckedObserver(this); };

    /**
     *  Creates an observer from the specified OnNext, along with optional OnError, and OnCompleted actions.
     *  
     *  @param {Function} [onNext] Observer's OnNext action implementation.
     *  @param {Function} [onError] Observer's OnError action implementation.
     *  @param {Function} [onCompleted] Observer's OnCompleted action implementation.
     *  @return The observer object implemented using the given actions.
     */
    var observerCreate = Observer.create = function (onNext, onError, onCompleted) {
        onNext || (onNext = noop);
        onError || (onError = defaultError);
        onCompleted || (onCompleted = noop);
        return new AnonymousObserver(onNext, onError, onCompleted);
    };

    /**
     *  Creates an observer from a notification callback.
     *  
     *  @param handler Action that handles a notification.
     *  @return The observer object that invokes the specified handler using a notification corresponding to each message it receives.
     */
    Observer.fromNotifier = function (handler) {
        return new AnonymousObserver(function (x) {
            return handler(notificationCreateOnNext(x));
        }, function (exception) {
            return handler(notificationCreateOnError(exception));
        }, function () {
            return handler(notificationCreateOnCompleted());
        });
    };
    
    /**
     *  Abstract base class for implementations of the IObserver&lt;T&gt; interface.
     *  
     *   This base class enforces the grammar of observers where OnError and OnCompleted are terminal messages. 
     */
    var AbstractObserver = root.Internals.AbstractObserver = (function () {
        inherits(AbstractObserver, Observer);

        /**
         * @constructor
         * Creates a new observer in a non-stopped state.
         */
        function AbstractObserver() {
            this.isStopped = false;
        }

        /**
         *  Notifies the observer of a new element in the sequence.
         *  
         *  @param value Next element in the sequence. 
         */
        AbstractObserver.prototype.onNext = function (value) {
            if (!this.isStopped) {
                this.next(value);
            }
        };

        /**
         *  Notifies the observer that an exception has occurred.
         *  
         *  @param error The error that has occurred.     
         */    
        AbstractObserver.prototype.onError = function (error) {
            if (!this.isStopped) {
                this.isStopped = true;
                this.error(error);
            }
        };

        /**
         *  Notifies the observer of the end of the sequence.
         */    
        AbstractObserver.prototype.onCompleted = function () {
            if (!this.isStopped) {
                this.isStopped = true;
                this.completed();
            }
        };

        /**
         *  Disposes the observer, causing it to transition to the stopped state.
         */
        AbstractObserver.prototype.dispose = function () {
            this.isStopped = true;
        };

        AbstractObserver.prototype.fail = function () {
            if (!this.isStopped) {
                this.isStopped = true;
                this.error(true);
                return true;
            }

            return false;
        };

        return AbstractObserver;
    }());

    /**
     * Class to create an Observer instance from delegate-based implementations of the on* methods.
     */
    var AnonymousObserver = root.AnonymousObserver = (function () {
        inherits(AnonymousObserver, AbstractObserver);

        /**
         * @constructor
         *  Creates an observer from the specified OnNext, OnError, and OnCompleted actions.
         *  
         *  @param onNext Observer's OnNext action implementation.
         *  @param onError Observer's OnError action implementation.
         *  @param onCompleted Observer's OnCompleted action implementation.  
         */      
        function AnonymousObserver(onNext, onError, onCompleted) {
            AnonymousObserver.super_.constructor.call(this);
            this._onNext = onNext;
            this._onError = onError;
            this._onCompleted = onCompleted;
        }

        /**
         *  Calls the onNext action.
         *  
         *  @param value Next element in the sequence.   
         */     
        AnonymousObserver.prototype.next = function (value) {
            this._onNext(value);
        };

        /**
         *  Calls the onError action.
         *  
         *  @param error The error that has occurred.   
         */     
        AnonymousObserver.prototype.error = function (exception) {
            this._onError(exception);
        };

        /**
         *  Calls the onCompleted action.
         */        
        AnonymousObserver.prototype.completed = function () {
            this._onCompleted();
        };

        return AnonymousObserver;
    }());

    var CheckedObserver = (function () {
        inherits(CheckedObserver, Observer);
        function CheckedObserver(observer) {
            this._observer = observer;
            this._state = 0; // 0 - idle, 1 - busy, 2 - done
        }

        CheckedObserver.prototype.onNext = function (value) {
            this.checkAccess();
            try {
                this._observer.onNext(value);
            } finally {
                this._state = 0;
            }
        };

        CheckedObserver.prototype.onError = function (err) {
            this.checkAccess();
            try {
                this._observer.onError(err);
            } finally {
                this._state = 2;
            }
        };

        CheckedObserver.prototype.onCompleted = function () {
            this.checkAccess();
            try {
                this._observer.onCompleted();
            } finally {
                this._state = 2;
            }
        };

        CheckedObserver.prototype.checkAccess = function () {
            if (this._state === 1) { throw new Error('Re-entrancy detected'); }
            if (this._state === 2) { throw new Error('Observer completed'); }
            if (this._state === 0) { this._state = 1; }
        };

        return CheckedObserver;
    }());

    var ScheduledObserver = root.Internals.ScheduledObserver = (function () {
        inherits(ScheduledObserver, AbstractObserver);
        function ScheduledObserver(scheduler, observer) {
            ScheduledObserver.super_.constructor.call(this);
            this.scheduler = scheduler;
            this.observer = observer;
            this.isAcquired = false;
            this.hasFaulted = false;
            this.queue = [];
            this.disposable = new SerialDisposable();
        }

        ScheduledObserver.prototype.next = function (value) {
            var self = this;
            this.queue.push(function () {
                self.observer.onNext(value);
            });
        };
        ScheduledObserver.prototype.error = function (exception) {
            var self = this;
            this.queue.push(function () {
                self.observer.onError(exception);
            });
        };
        ScheduledObserver.prototype.completed = function () {
            var self = this;
            this.queue.push(function () {
                self.observer.onCompleted();
            });
        };
        ScheduledObserver.prototype.ensureActive = function () {
            var isOwner = false, parent = this;
            if (!this.hasFaulted && this.queue.length > 0) {
                isOwner = !this.isAcquired;
                this.isAcquired = true;
            }
            if (isOwner) {
                this.disposable.setDisposable(this.scheduler.scheduleRecursive(function (self) {
                    var work;
                    if (parent.queue.length > 0) {
                        work = parent.queue.shift();
                    } else {
                        parent.isAcquired = false;
                        return;
                    }
                    try {
                        work();
                    } catch (ex) {
                        parent.queue = [];
                        parent.hasFaulted = true;
                        throw ex;
                    }
                    self();
                }));
            }
        };
        ScheduledObserver.prototype.dispose = function () {
            ScheduledObserver.super_.dispose.call(this);
            this.disposable.dispose();
        };

        return ScheduledObserver;
    }());

    var ObserveOnObserver = (function () {
        inherits(ObserveOnObserver, ScheduledObserver);
        function ObserveOnObserver() {
            ObserveOnObserver.super_.constructor.apply(this, arguments);
        }
        ObserveOnObserver.prototype.next = function (value) {
            ObserveOnObserver.super_.next.call(this, value);
            this.ensureActive();
        };
        ObserveOnObserver.prototype.error = function (e) {
            ObserveOnObserver.super_.error.call(this, e);
            this.ensureActive();
        };
        ObserveOnObserver.prototype.completed = function () {
            ObserveOnObserver.super_.completed.call(this);
            this.ensureActive();
        };

        return ObserveOnObserver;
    })();

    var observableProto;

    /**
     * Represents a push-style collection.
     */
    var Observable = root.Observable = (function () {

        /**
         * @constructor
         */
        function Observable(subscribe) {
            this._subscribe = subscribe;
        }

        observableProto = Observable.prototype;

        observableProto.finalValue = function () {
            var source = this;
            return new AnonymousObservable(function (observer) {
                var hasValue = false, value;
                return source.subscribe(function (x) {
                    hasValue = true;
                    value = x;
                }, observer.onError.bind(observer), function () {
                    if (!hasValue) {
                        observer.onError(new Error(sequenceContainsNoElements));
                    } else {
                        observer.onNext(value);
                        observer.onCompleted();
                    }
                });
            });
        };

        /**
         *  Subscribes an observer to the observable sequence.
         *  
         *  1 - source.subscribe();
         *  2 - source.subscribe(observer);
         *  3 - source.subscribe(function (x) { console.log(x); });
         *  4 - source.subscribe(function (x) { console.log(x); }, function (err) { console.log(err); });
         *  5 - source.subscribe(function (x) { console.log(x); }, function (err) { console.log(err); }, function () { console.log('done'); });
         *  
         *  @param {Mixed} [observerOrOnNext] The object that is to receive notifications or an action to invoke for each element in the observable sequence.
         *  @param {Function} [onError] Action to invoke upon exceptional termination of the observable sequence.
         *  @param {Function} [onCompleted] Action to invoke upon graceful termination of the observable sequence.
         *  @return The source sequence whose subscriptions and unsubscriptions happen on the specified scheduler. 
         */
        observableProto.subscribe = function (observerOrOnNext, onError, onCompleted) {
            var subscriber;
            if (arguments.length === 0 || arguments.length > 1 || typeof observerOrOnNext === 'function') {
                subscriber = observerCreate(observerOrOnNext, onError, onCompleted);
            } else {
                subscriber = observerOrOnNext;
            }
            return this._subscribe(subscriber);
        };

        /**
         *  Creates a list from an observable sequence.
         *  
         * @returns An observable sequence containing a single element with a list containing all the elements of the source sequence.  
         */
        observableProto.toArray = function () {
            function accumulator(list, i) {
                var newList = list.slice(0);
                newList.push(i);
                return newList;
            }
            return this.scan([], accumulator).startWith([]).finalValue();
        };

        return Observable;
    })();

    /**
     * Invokes the specified function asynchronously on the specified scheduler, surfacing the result through an observable sequence.
     * 
     * 1 - res = Rx.Observable.start(function () { console.log('hello'); });
     * 2 - res = Rx.Observable.start(function () { console.log('hello'); }, Rx.Scheduler.timeout);
     * 2 - res = Rx.Observable.start(function () { this.log('hello'); }, Rx.Scheduler.timeout, console);
     * 
     * @param func Function to run asynchronously.
     * @param [scheduler]  Scheduler to run the function on. If not specified, defaults to Scheduler.timeout.
     * @param [context]  The context for the func parameter to be executed.  If not specified, defaults to undefined.
    * @return An observable sequence exposing the function's result value, or an exception.
     * 
     * Remarks
     * * The function is called immediately, not during the subscription of the resulting sequence.
     * * Multiple subscriptions to the resulting sequence can observe the function's result.  
     */
    Observable.start = function (func, scheduler, context) {
        return observableToAsync(func, scheduler)();
    };

    /**
     * Converts the function into an asynchronous function. Each invocation of the resulting asynchronous function causes an invocation of the original synchronous function on the specified scheduler.
     * 
     * 1 - res = Rx.Observable.toAsync(function (x, y) { return x + y; })(4, 3);
     * 2 - res = Rx.Observable.toAsync(function (x, y) { return x + y; }, Rx.Scheduler.timeout)(4, 3);
     * 2 - res = Rx.Observable.toAsync(function (x) { this.log(x); }, Rx.Scheduler.timeout, console)('hello');
     * 
     * @param function Function to convert to an asynchronous function.
     * @param [scheduler] Scheduler to run the function on. If not specified, defaults to Scheduler.timeout.
     * @param [context] The context for the func parameter to be executed.  If not specified, defaults to undefined.
     * @return Asynchronous function.
     */
    var observableToAsync = Observable.toAsync = function (func, scheduler, context) {
        scheduler || (scheduler = timeoutScheduler);
        return function () {
            var args = slice.call(arguments, 0), subject = new AsyncSubject();
            scheduler.schedule(function () {
                var result;
                try {
                    result = func.apply(context, args);
                } catch (e) {
                    subject.onError(e);
                    return;
                }
                subject.onNext(result);
                subject.onCompleted();
            });
            return subject.asObservable();
        };
    };    
     /**
     *  Wraps the source sequence in order to run its observer callbacks on the specified scheduler.
     *  
     *  @param scheduler Scheduler to notify observers on.</param>
     *  @return The source sequence whose observations happen on the specified scheduler.</returns>
     *  
     *  This only invokes observer callbacks on a scheduler. In case the subscription and/or unsubscription actions have side-effects
     *  that require to be run on a scheduler, use subscribeOn.
     *          
     */
    observableProto.observeOn = function (scheduler) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            return source.subscribe(new ObserveOnObserver(scheduler, observer));
        });
    };

     /**
     *  Wraps the source sequence in order to run its subscription and unsubscription logic on the specified scheduler. This operation is not commonly used;
     *  see the remarks section for more information on the distinction between subscribeOn and observeOn.
     *  
     *  @param scheduler Scheduler to perform subscription and unsubscription actions on.</param>
     *  @return The source sequence whose subscriptions and unsubscriptions happen on the specified scheduler.</returns>
     *  
     *  This only performs the side-effects of subscription and unsubscription on the specified scheduler. In order to invoke observer
     *  callbacks on a scheduler, use observeOn.
     *    
     */
    observableProto.subscribeOn = function (scheduler) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var m = new SingleAssignmentDisposable(), d = new SerialDisposable();
            d.setDisposable(m);
            m.setDisposable(scheduler.schedule(function () {
                d.setDisposable(new ScheduledDisposable(scheduler, source.subscribe(observer)));
            }));
            return d;
        });
    };
    
    /**
     *  Creates an observable sequence from a specified subscribe method implementation.
     *  
     *  1 - res = Rx.Observable.create(function (observer) { return function () { } );
     *  
     *  @param subscribe Implementation of the resulting observable sequence's subscribe method, returning a function that will be wrapped in a Disposable.
     *  @return The observable sequence with the specified implementation for the Subscribe method.
     */
    Observable.create = function (subscribe) {
        return new AnonymousObservable(function (o) {
            return disposableCreate(subscribe(o));
        });
    };

    /**
     *  Creates an observable sequence from a specified subscribe method implementation.
     *  
     *  1 - res = Rx.Observable.create(function (observer) { return Rx.Disposable.empty; } );        
     *  
     *  @param subscribe Implementation of the resulting observable sequence's subscribe method.
     *  @return The observable sequence with the specified implementation for the Subscribe method.
     */
    Observable.createWithDisposable = function (subscribe) {
        return new AnonymousObservable(subscribe);
    };

    /**
     *  Returns an observable sequence that invokes the specified factory function whenever a new observer subscribes.
     *  
     *  1 - res = Rx.Observable.defer(function () { return Rx.Observable.fromArray([1,2,3]); });    
     *  
     *  @param observableFactory Observable factory function to invoke for each observer that subscribes to the resulting sequence.
     *  @return An observable sequence whose observers trigger an invocation of the given observable factory function.
     */
    var observableDefer = Observable.defer = function (observableFactory) {
        return new AnonymousObservable(function (observer) {
            var result;
            try {
                result = observableFactory();
            } catch (e) {
                return observableThrow(e).subscribe(observer);
            }
            return result.subscribe(observer);
        });
    };

    /**
     *  Returns an empty observable sequence, using the specified scheduler to send out the single OnCompleted message.
     *  
     *  1 - res = Rx.Observable.empty();  
     *  2 - res = Rx.Observable.empty(Rx.Scheduler.timeout);  
     *  
     *  @param scheduler Scheduler to send the termination call on.
     *  @return An observable sequence with no elements.
     */
    var observableEmpty = Observable.empty = function (scheduler) {
        scheduler || (scheduler = immediateScheduler);
        return new AnonymousObservable(function (observer) {
            return scheduler.schedule(function () {
                observer.onCompleted();
            });
        });
    };

    /**
     *  Converts an array to an observable sequence, using an optional scheduler to enumerate the array.
     *  
     *  1 - res = Rx.Observable.fromArray([1,2,3]);
     *  2 - res = Rx.Observable.fromArray([1,2,3], Rx.Scheduler.timeout);
     *  
     *  @param scheduler [Optional] Scheduler to run the enumeration of the input sequence on.
     *  @return The observable sequence whose elements are pulled from the given enumerable sequence.
     */
    var observableFromArray = Observable.fromArray = function (array, scheduler) {
        scheduler || (scheduler = currentThreadScheduler);
        return new AnonymousObservable(function (observer) {
            var count = 0;
            return scheduler.scheduleRecursive(function (self) {
                if (count < array.length) {
                    observer.onNext(array[count++]);
                    self();
                } else {
                    observer.onCompleted();
                }
            });
        });
    };

    /**
     *  Generates an observable sequence by running a state-driven loop producing the sequence's elements, using the specified scheduler to send out observer messages.
     *  
     *  1 - res = Rx.Observable.generate(0, function (x) { return x < 10; }, function (x) { return x + 1; }, function (x) { return x; });
     *  2 - res = Rx.Observable.generate(0, function (x) { return x < 10; }, function (x) { return x + 1; }, function (x) { return x; }, Rx.Scheduler.timeout);
     *  
     *  @param initialState Initial state.
     *  @param condition Condition to terminate generation (upon returning false).
     *  @param iterate Iteration step function.
     *  @param resultSelector Selector function for results produced in the sequence.
     *  @param scheduler [Optional] Scheduler on which to run the generator loop. If not provided, defaults to Scheduler.currentThread.
     *  @return The generated sequence.
     */
    Observable.generate = function (initialState, condition, iterate, resultSelector, scheduler) {
        scheduler || (scheduler = currentThreadScheduler);
        return new AnonymousObservable(function (observer) {
            var first = true, state = initialState;
            return scheduler.scheduleRecursive(function (self) {
                var hasResult, result;
                try {
                    if (first) {
                        first = false;
                    } else {
                        state = iterate(state);
                    }
                    hasResult = condition(state);
                    if (hasResult) {
                        result = resultSelector(state);
                    }
                } catch (exception) {
                    observer.onError(exception);
                    return;
                }
                if (hasResult) {
                    observer.onNext(result);
                    self();
                } else {
                    observer.onCompleted();
                }
            });
        });
    };

    /**
     *  Returns a non-terminating observable sequence, which can be used to denote an infinite duration (e.g. when using reactive joins).
     *  
     *  @return An observable sequence whose observers will never get called.
     */
    var observableNever = Observable.never = function () {
        return new AnonymousObservable(function () {
            return disposableEmpty;
        });
    };

    /**
     *  Generates an observable sequence of integral numbers within a specified range, using the specified scheduler to send out observer messages.
     *  
     *  1 - res = Rx.Observable.range(0, 10);
     *  2 - res = Rx.Observable.range(0, 10, Rx.Scheduler.timeout);
     *  
     *  @param start The value of the first integer in the sequence.
     *  @param count The number of sequential integers to generate.
     *  @param scheduler [Optional] Scheduler to run the generator loop on. If not specified, defaults to Scheduler.currentThread.
     *  @return An observable sequence that contains a range of sequential integral numbers.
     */
    Observable.range = function (start, count, scheduler) {
        scheduler || (scheduler = currentThreadScheduler);
        return new AnonymousObservable(function (observer) {
            return scheduler.scheduleRecursiveWithState(0, function (i, self) {
                if (i < count) {
                    observer.onNext(start + i);
                    self(i + 1);
                } else {
                    observer.onCompleted();
                }
            });
        });
    };

    /**
     *  Generates an observable sequence that repeats the given element the specified number of times, using the specified scheduler to send out observer messages.
     *  
     *  1 - res = Rx.Observable.repeat(42);
     *  2 - res = Rx.Observable.repeat(42, 4);
     *  3 - res = Rx.Observable.repeat(42, 4, Rx.Scheduler.timeout);
     *  4 - res = Rx.Observable.repeat(42, null, Rx.Scheduler.timeout);
     *  
     *  @param value Element to repeat.
     *  @param repeatCount [Optiona] Number of times to repeat the element. If not specified, repeats indefinitely.
     *  @param scheduler Scheduler to run the producer loop on. If not specified, defaults to Scheduler.immediate.
     *  @return An observable sequence that repeats the given element the specified number of times.
     */
    Observable.repeat = function (value, repeatCount, scheduler) {
        scheduler || (scheduler = currentThreadScheduler);
        if (repeatCount == undefined) {
            repeatCount = -1;
        }
        return observableReturn(value, scheduler).repeat(repeatCount);
    };

    /**
     *  Returns an observable sequence that contains a single element, using the specified scheduler to send out observer messages.
     *  
     *  1 - res = Rx.Observable.returnValue(42);
     *  2 - res = Rx.Observable.returnValue(42, Rx.Scheduler.timeout);
     *  
     *  @param value Single element in the resulting observable sequence.
     *  @param scheduler Scheduler to send the single element on. If not specified, defaults to Scheduler.immediate.
     *  @return An observable sequence containing the single specified element.
     */
    var observableReturn = Observable.returnValue = function (value, scheduler) {
        scheduler || (scheduler = immediateScheduler);
        return new AnonymousObservable(function (observer) {
            return scheduler.schedule(function () {
                observer.onNext(value);
                observer.onCompleted();
            });
        });
    };

    /**
     *  Returns an observable sequence that terminates with an exception, using the specified scheduler to send out the single OnError message.
     *  
     *  1 - res = Rx.Observable.throwException(new Error('Error'));
     *  2 - res = Rx.Observable.throwException(new Error('Error'), Rx.Scheduler.timeout);
     *  
     *  @param exception An object used for the sequence's termination.
     *  @param scheduler Scheduler to send the exceptional termination call on. If not specified, defaults to Scheduler.immediate.
     *  @return The observable sequence that terminates exceptionally with the specified exception object.
     */
    var observableThrow = Observable.throwException = function (exception, scheduler) {
        scheduler || (scheduler = immediateScheduler);
        return new AnonymousObservable(function (observer) {
            return scheduler.schedule(function () {
                observer.onError(exception);
            });
        });
    };

    /**
     *  Constructs an observable sequence that depends on a resource object, whose lifetime is tied to the resulting observable sequence's lifetime.
     *  
     *  1 - res = Rx.Observable.using(function () { return new AsyncSubject(); }, function (s) { return s; });
     *  
     *  @param resourceFactory Factory function to obtain a resource object.
     *  @param observableFactory Factory function to obtain an observable sequence that depends on the obtained resource.
     *  @return An observable sequence whose lifetime controls the lifetime of the dependent resource object.
     */
    Observable.using = function (resourceFactory, observableFactory) {
        return new AnonymousObservable(function (observer) {
            var disposable = disposableEmpty, resource, source;
            try {
                resource = resourceFactory();
                if (resource) {
                    disposable = resource;
                }
                source = observableFactory(resource);
            } catch (exception) {
                return new CompositeDisposable(observableThrow(exception).subscribe(observer), disposable);
            }
            return new CompositeDisposable(source.subscribe(observer), disposable);
        });
    };                        
    
    /**
     * Propagates the observable sequence that reacts first.
     * 
     * @param rightSource Second observable sequence.
     * @return An observable sequence that surfaces either of the given sequences, whichever reacted first.
     */  
    observableProto.amb = function (rightSource) {
        var leftSource = this;
        return new AnonymousObservable(function (observer) {

            var choice,
                leftChoice = 'L', rightChoice = 'R',
                leftSubscription = new SingleAssignmentDisposable(),
                rightSubscription = new SingleAssignmentDisposable();

            function choiceL() {
                if (!choice) {
                    choice = leftChoice;
                    rightSubscription.dispose();
                }
            }

            function choiceR() {
                if (!choice) {
                    choice = rightChoice;
                    leftSubscription.dispose();
                }
            }

            leftSubscription.setDisposable(leftSource.subscribe(function (left) {
                choiceL();
                if (choice === leftChoice) {
                    observer.onNext(left);
                }
            }, function (err) {
                choiceL();
                if (choice === leftChoice) {
                    observer.onError(err);
                }
            }, function () {
                choiceL();
                if (choice === leftChoice) {
                    observer.onCompleted();
                }
            }));

            rightSubscription.setDisposable(rightSource.subscribe(function (right) {
                choiceR();
                if (choice === rightChoice) {
                    observer.onNext(right);
                }
            }, function (err) {
                choiceR();
                if (choice === rightChoice) {
                    observer.onError(err);
                }
            }, function () {
                choiceR();
                if (choice === rightChoice) {
                    observer.onCompleted();
                }
            }));

            return new CompositeDisposable(leftSubscription, rightSubscription);
        });
    };

    /**
     * Propagates the observable sequence that reacts first.
     * 
     * E.g. winner = Rx.Observable.amb(xs, ys, zs);
     * 
     * @return An observable sequence that surfaces any of the given sequences, whichever reacted first.
     */  
    Observable.amb = function () {
        var acc = observableNever(),
            items = argsOrArray(arguments, 0);
        function func(previous, current) {
            return previous.amb(current);
        }
        for (var i = 0, len = items.length; i < len; i++) {
            acc = func(acc, items[i]);
        }
        return acc;
    };

    function observableCatchHandler(source, handler) {
        return new AnonymousObservable(function (observer) {
            var d1 = new SingleAssignmentDisposable(), subscription = new SerialDisposable();
            subscription.setDisposable(d1);
            d1.setDisposable(source.subscribe(observer.onNext.bind(observer), function (exception) {
                var d, result;
                try {
                    result = handler(exception);
                } catch (ex) {
                    observer.onError(ex);
                    return;
                }
                d = new SingleAssignmentDisposable();
                subscription.setDisposable(d);
                d.setDisposable(result.subscribe(observer));
            }, observer.onCompleted.bind(observer)));
            return subscription;
        });
    }

    /**
     * Continues an observable sequence that is terminated by an exception with the next observable sequence.
     * 
     * 1 - xs.catchException(ys)
     * 2 - xs.catchException(function (ex) { return ys(ex); })
     * 
     * @param {Mixed} handlerOrSecond Exception handler function that returns an observable sequence given the error that occurred in the first sequence, or a second observable sequence used to produce results when an error occurred in the first sequence.
     * @return An observable sequence containing the first sequence's elements, followed by the elements of the handler sequence in case an exception occurred.
     */      
    observableProto.catchException = function (handlerOrSecond) {
        if (typeof handlerOrSecond === 'function') {
            return observableCatchHandler(this, handlerOrSecond);
        }
        return observableCatch([this, handlerOrSecond]);
    };

    /**
     * Continues an observable sequence that is terminated by an exception with the next observable sequence.
     * 
     * 1 - res = Rx.Observable.catchException(xs, ys, zs);
     * 2 - res = Rx.Observable.catchException([xs, ys, zs]);
     * 
     * @return An observable sequence containing elements from consecutive source sequences until a source sequence terminates successfully.
     */
    var observableCatch = Observable.catchException = function () {
        var items = argsOrArray(arguments, 0);
        return enumerableFor(items).catchException();
    };

    /**
     * Merges the specified observable sequences into one observable sequence by using the selector function whenever any of the observable sequences produces an element.
     * This can be in the form of an argument list of observables or an array.
     * 
     * 1 - obs = observable.combineLatest(obs1, obs2, obs3, function (o1, o2, o3) { return o1 + o2 + o3; });
     * 2 - obs = observable.combineLatest([obs1, obs2, obs3], function (o1, o2, o3) { return o1 + o2 + o3; });
     * 
     * @return An observable sequence containing the result of combining elements of the sources using the specified result selector function. 
     */
    observableProto.combineLatest = function () {
        var args = slice.call(arguments);
        if (Array.isArray(args[0])) {
            args[0].unshift(this);
        } else {
            args.unshift(this);
        }
        return combineLatest.apply(this, args);
    };

    /**
     * Merges the specified observable sequences into one observable sequence by using the selector function whenever any of the observable sequences produces an element.
     * 
     * 1 - obs = Rx.Observable.combineLatest(obs1, obs2, obs3, function (o1, o2, o3) { return o1 + o2 + o3; });
     * 2 - obs = Rx.Observable.combineLatest([obs1, obs2, obs3], function (o1, o2, o3) { return o1 + o2 + o3; });     
     * 
     * @return An observable sequence containing the result of combining elements of the sources using the specified result selector function.
     */
    var combineLatest = Observable.combineLatest = function () {
        var args = slice.call(arguments), resultSelector = args.pop();
        
        if (Array.isArray(args[0])) {
            args = args[0];
        }

        return new AnonymousObservable(function (observer) {
            var falseFactory = function () { return false; },
                n = args.length,
                hasValue = arrayInitialize(n, falseFactory),
                hasValueAll = false,
                isDone = arrayInitialize(n, falseFactory),
                values = new Array(n);

            function next(i) {
                var res;
                hasValue[i] = true;
                if (hasValueAll || (hasValueAll = hasValue.every(function (x) { return x; }))) {
                    try {
                        res = resultSelector.apply(null, values);
                    } catch (ex) {
                        observer.onError(ex);
                        return;
                    }
                    observer.onNext(res);
                } else if (isDone.filter(function (x, j) { return j !== i; }).every(function (x) { return x; })) {
                    observer.onCompleted();
                }
            }

            function done (i) {
                isDone[i] = true;
                if (isDone.every(function (x) { return x; })) {
                    observer.onCompleted();
                }
            }

            var subscriptions = new Array(n);
            for (var idx = 0; idx < n; idx++) {
                (function (i) {
                    subscriptions[i] = new SingleAssignmentDisposable();
                    subscriptions[i].setDisposable(args[i].subscribe(function (x) {
                        values[i] = x;
                        next(i);
                    }, observer.onError.bind(observer), function () {
                        done(i);
                    }));
                })(idx);
            }

            return new CompositeDisposable(subscriptions);
        });
    };

    /**
     * Concatenates all the observable sequences.  This takes in either an array or variable arguments to concatenate.
     * 
     * 1 - concatenated = xs.concat(ys, zs);
     * 2 - concatenated = xs.concat([ys, zs]);
     * 
     * @return An observable sequence that contains the elements of each given sequence, in sequential order. 
     */ 
    observableProto.concat = function () {
        var items = slice.call(arguments, 0);
        items.unshift(this);
        return observableConcat.apply(this, items);
    };

    /**
     * Concatenates all the observable sequences.
     * 
     * 1 - res = Rx.Observable.concat(xs, ys, zs);
     * 2 - res = Rx.Observable.concat([xs, ys, zs]);
     * 
     * @return An observable sequence that contains the elements of each given sequence, in sequential order. 
     */
    var observableConcat = Observable.concat = function () {
        var sources = argsOrArray(arguments, 0);
        return enumerableFor(sources).concat();
    };    

    /**
     * Concatenates an observable sequence of observable sequences.
     * 
     * @return An observable sequence that contains the elements of each observed inner sequence, in sequential order. 
     */ 
    observableProto.concatObservable = observableProto.concatAll =function () {
        return this.merge(1);
    };

    /**
     * Merges an observable sequence of observable sequences into an observable sequence, limiting the number of concurrent subscriptions to inner sequences.
     * Or merges two observable sequences into a single observable sequence.
     * 
     * 1 - merged = sources.merge(1);
     * 2 - merged = source.merge(otherSource);  
     * 
     * @param [maxConcurrentOrOther] Maximum number of inner observable sequences being subscribed to concurrently or the second observable sequence.
     * @return The observable sequence that merges the elements of the inner sequences. 
     */ 
    observableProto.merge = function (maxConcurrentOrOther) {
        if (typeof maxConcurrentOrOther !== 'number') {
            return observableMerge(this, maxConcurrentOrOther);
        }
        var sources = this;
        return new AnonymousObservable(function (observer) {
            var activeCount = 0,
                group = new CompositeDisposable(),
                isStopped = false,
                q = [],
                subscribe = function (xs) {
                    var subscription = new SingleAssignmentDisposable();
                    group.add(subscription);
                    subscription.setDisposable(xs.subscribe(observer.onNext.bind(observer), observer.onError.bind(observer), function () {
                        var s;
                        group.remove(subscription);
                        if (q.length > 0) {
                            s = q.shift();
                            subscribe(s);
                        } else {
                            activeCount--;
                            if (isStopped && activeCount === 0) {
                                observer.onCompleted();
                            }
                        }
                    }));
                };
            group.add(sources.subscribe(function (innerSource) {
                if (activeCount < maxConcurrentOrOther) {
                    activeCount++;
                    subscribe(innerSource);
                } else {
                    q.push(innerSource);
                }
            }, observer.onError.bind(observer), function () {
                isStopped = true;
                if (activeCount === 0) {
                    observer.onCompleted();
                }
            }));
            return group;
        });
    };

    /**
     * Merges all the observable sequences into a single observable sequence.  
     * The scheduler is optional and if not specified, the immediate scheduler is used.
     * 
     * 1 - merged = Rx.Observable.merge(xs, ys, zs);
     * 2 - merged = Rx.Observable.merge([xs, ys, zs]);
     * 3 - merged = Rx.Observable.merge(scheduler, xs, ys, zs);
     * 4 - merged = Rx.Observable.merge(scheduler, [xs, ys, zs]);    
     * 
     * 
     * @return The observable sequence that merges the elements of the observable sequences. 
     */  
    var observableMerge = Observable.merge = function () {
        var scheduler, sources;
        if (!arguments[0]) {
            scheduler = immediateScheduler;
            sources = slice.call(arguments, 1);
        } else if (arguments[0].now) {
            scheduler = arguments[0];
            sources = slice.call(arguments, 1);
        } else {
            scheduler = immediateScheduler;
            sources = slice.call(arguments, 0);
        }
        if (Array.isArray(sources[0])) {
            sources = sources[0];
        }
        return observableFromArray(sources, scheduler).mergeObservable();
    };    

    /**
     * Merges an observable sequence of observable sequences into an observable sequence.
     * 
     * @return The observable sequence that merges the elements of the inner sequences.   
     */  
    observableProto.mergeObservable = observableProto.mergeAll =function () {
        var sources = this;
        return new AnonymousObservable(function (observer) {
            var group = new CompositeDisposable(),
                isStopped = false,
                m = new SingleAssignmentDisposable();
            group.add(m);
            m.setDisposable(sources.subscribe(function (innerSource) {
                var innerSubscription = new SingleAssignmentDisposable();
                group.add(innerSubscription);
                innerSubscription.setDisposable(innerSource.subscribe(function (x) {
                    observer.onNext(x);
                }, observer.onError.bind(observer), function () {
                    group.remove(innerSubscription);
                    if (isStopped && group.length === 1) {
                        observer.onCompleted();
                    }
                }));
            }, observer.onError.bind(observer), function () {
                isStopped = true;
                if (group.length === 1) {
                    observer.onCompleted();
                }
            }));
            return group;
        });
    };

    /**
     * Continues an observable sequence that is terminated normally or by an exception with the next observable sequence.
     * 
     * @param second Second observable sequence used to produce results after the first sequence terminates.
     * @return An observable sequence that concatenates the first and second sequence, even if the first sequence terminates exceptionally.
     */
    observableProto.onErrorResumeNext = function (second) {
        if (!second) {
            throw new Error('Second observable is required');
        }
        return onErrorResumeNext([this, second]);
    };

    /**
     * Continues an observable sequence that is terminated normally or by an exception with the next observable sequence.
     * 
     * 1 - res = Rx.Observable.onErrorResumeNext(xs, ys, zs);
     * 1 - res = Rx.Observable.onErrorResumeNext([xs, ys, zs]);
     * 
     * @return An observable sequence that concatenates the source sequences, even if a sequence terminates exceptionally.   
     */
    var onErrorResumeNext = Observable.onErrorResumeNext = function () {
        var sources = argsOrArray(arguments, 0);
        return new AnonymousObservable(function (observer) {
            var pos = 0, subscription = new SerialDisposable(),
            cancelable = immediateScheduler.scheduleRecursive(function (self) {
                var current, d;
                if (pos < sources.length) {
                    current = sources[pos++];
                    d = new SingleAssignmentDisposable();
                    subscription.setDisposable(d);
                    d.setDisposable(current.subscribe(observer.onNext.bind(observer), function () {
                        self();
                    }, function () {
                        self();
                    }));
                } else {
                    observer.onCompleted();
                }
            });
            return new CompositeDisposable(subscription, cancelable);
        });
    };

    /**
     * Returns the values from the source observable sequence only after the other observable sequence produces a value.
     * 
     * @param other The observable sequence that triggers propagation of elements of the source sequence.
     * @return An observable sequence containing the elements of the source sequence starting from the point the other sequence triggered propagation.    
     */
    observableProto.skipUntil = function (other) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var isOpen = false;
            var disposables = new CompositeDisposable(source.subscribe(function (left) {
                if (isOpen) {
                    observer.onNext(left);
                }
            }, observer.onError.bind(observer), function () {
                if (isOpen) {
                    observer.onCompleted();
                }
            }));

            var rightSubscription = new SingleAssignmentDisposable();
            disposables.add(rightSubscription);
            rightSubscription.setDisposable(other.subscribe(function () {
                isOpen = true;
                rightSubscription.dispose();
            }, observer.onError.bind(observer), function () {
                rightSubscription.dispose();
            }));

            return disposables;
        });
    };

    /**
     * Transforms an observable sequence of observable sequences into an observable sequence producing values only from the most recent observable sequence.
     * 
     * @return The observable sequence that at any point in time produces the elements of the most recent inner observable sequence that has been received.  
     */
    observableProto.switchLatest = function () {
        var sources = this;
        return new AnonymousObservable(function (observer) {
            var hasLatest = false,
                innerSubscription = new SerialDisposable(),
                isStopped = false,
                latest = 0,
                subscription = sources.subscribe(function (innerSource) {
                    var d = new SingleAssignmentDisposable(), id = ++latest;
                    hasLatest = true;
                    innerSubscription.setDisposable(d);
                    d.setDisposable(innerSource.subscribe(function (x) {
                        if (latest === id) {
                            observer.onNext(x);
                        }
                    }, function (e) {
                        if (latest === id) {
                            observer.onError(e);
                        }
                    }, function () {
                        if (latest === id) {
                            hasLatest = false;
                            if (isStopped) {
                                observer.onCompleted();
                            }
                        }
                    }));
                }, observer.onError.bind(observer), function () {
                    isStopped = true;
                    if (!hasLatest) {
                        observer.onCompleted();
                    }
                });
            return new CompositeDisposable(subscription, innerSubscription);
        });
    };

    /**
     * Returns the values from the source observable sequence until the other observable sequence produces a value.
     * 
     * @param other Observable sequence that terminates propagation of elements of the source sequence.
     * @return An observable sequence containing the elements of the source sequence up to the point the other sequence interrupted further propagation.   
     */
    observableProto.takeUntil = function (other) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            return new CompositeDisposable(
                source.subscribe(observer),
                other.subscribe(observer.onCompleted.bind(observer), observer.onError.bind(observer), noop)
            );
        });
    };

    function zipArray(second, resultSelector) {
        var first = this;
        return new AnonymousObservable(function (observer) {
            var index = 0, len = second.length;
            return first.subscribe(function (left) {
                if (index < len) {
                    var right = second[index++], result;
                    try {
                        result = resultSelector(left, right);
                    } catch (e) {
                        observer.onError(e);
                        return;
                    }
                    observer.onNext(result);
                } else {
                    observer.onCompleted();
                }
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    }    

    /**
     * Merges the specified observable sequences into one observable sequence by using the selector function whenever all of the observable sequences or an array have produced an element at a corresponding index.
     * The last element in the arguments must be a function to invoke for each series of elements at corresponding indexes in the sources.
     * 1 - res = obs1.zip(obs2, fn);
     * 1 - res = x1.zip([1,2,3], fn);  
     * 
     * @return An observable sequence containing the result of combining elements of the sources using the specified result selector function. 
     */   
    observableProto.zip = function () {
        if (Array.isArray(arguments[0])) {
            return zipArray.apply(this, arguments);
        }
        var parent = this, sources = slice.call(arguments), resultSelector = sources.pop();
        sources.unshift(parent);
        return new AnonymousObservable(function (observer) {
            var n = sources.length,
              queues = arrayInitialize(n, function () { return []; }),
              isDone = arrayInitialize(n, function () { return false; });
            var next = function (i) {
                var res, queuedValues;
                if (queues.every(function (x) { return x.length > 0; })) {
                    try {
                        queuedValues = queues.map(function (x) { return x.shift(); });
                        res = resultSelector.apply(parent, queuedValues);
                    } catch (ex) {
                        observer.onError(ex);
                        return;
                    }
                    observer.onNext(res);
                } else if (isDone.filter(function (x, j) { return j !== i; }).every(function (x) { return x; })) {
                    observer.onCompleted();
                }
            };

            function done(i) {
                isDone[i] = true;
                if (isDone.every(function (x) { return x; })) {
                    observer.onCompleted();
                }
            }

            var subscriptions = new Array(n);
            for (var idx = 0; idx < n; idx++) {
                (function (i) {
                    subscriptions[i] = new SingleAssignmentDisposable();
                    subscriptions[i].setDisposable(sources[i].subscribe(function (x) {
                        queues[i].push(x);
                        next(i);
                    }, observer.onError.bind(observer), function () {
                        done(i);
                    }));
                })(idx);
            }

            return new CompositeDisposable(subscriptions);
        });
    };
    /**
     *  Hides the identity of an observable sequence.
     *  
     *  @return An observable sequence that hides the identity of the source sequence.    
     */
    observableProto.asObservable = function () {
        var source = this;
        return new AnonymousObservable(function (observer) {
            return source.subscribe(observer);
        });
    };

    /**
     *  Projects each element of an observable sequence into zero or more buffers which are produced based on element count information.
     *  
     *  1 - xs.bufferWithCount(10);
     *  2 - xs.bufferWithCount(10, 1);
     *  
     *  @param count Length of each buffer.
     *  @param [skip] Number of elements to skip between creation of consecutive buffers. If not provided, defaults to the count.
     *  @return An observable sequence of buffers.    
     */
    observableProto.bufferWithCount = function (count, skip) {
        if (skip === undefined) {
            skip = count;
        }
        return this.windowWithCount(count, skip).selectMany(function (x) {
            return x.toArray();
        }).where(function (x) {
            return x.length > 0;
        });
    };

    /**
     *  Dematerializes the explicit notification values of an observable sequence as implicit notifications.
     *  
     *  @return An observable sequence exhibiting the behavior corresponding to the source sequence's notification values.
     */ 
    observableProto.dematerialize = function () {
        var source = this;
        return new AnonymousObservable(function (observer) {
            return source.subscribe(function (x) {
                return x.accept(observer);
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    /**
     *  Returns an observable sequence that contains only distinct contiguous elements according to the keySelector and the comparer.
     *  
     *  1 - var obs = observable.distinctUntilChanged();
     *  2 - var obs = observable.distinctUntilChanged(function (x) { return x.id; });
     *  3 - var obs = observable.distinctUntilChanged(function (x) { return x.id; }, function (x, y) { return x === y; });
     *  
     *  @param {Function} [keySelector] A function to compute the comparison key for each element. If not provided, it projects the value.
     *  @param {Function} [comparer] Equality comparer for computed key values. If not provided, defaults to an equality comparer function.
     *  @return An observable sequence only containing the distinct contiguous elements, based on a computed key value, from the source sequence.   
     */
    observableProto.distinctUntilChanged = function (keySelector, comparer) {
        var source = this;
        keySelector || (keySelector = identity);
        comparer || (comparer = defaultComparer);
        return new AnonymousObservable(function (observer) {
            var hasCurrentKey = false, currentKey;
            return source.subscribe(function (value) {
                var comparerEquals = false, key;
                try {
                    key = keySelector(value);
                } catch (exception) {
                    observer.onError(exception);
                    return;
                }
                if (hasCurrentKey) {
                    try {
                        comparerEquals = comparer(currentKey, key);
                    } catch (exception) {
                        observer.onError(exception);
                        return;
                    }
                }
                if (!hasCurrentKey || !comparerEquals) {
                    hasCurrentKey = true;
                    currentKey = key;
                    observer.onNext(value);
                }
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    /**
     *  Invokes an action for each element in the observable sequence and invokes an action upon graceful or exceptional termination of the observable sequence.
     *  This method can be used for debugging, logging, etc. of query behavior by intercepting the message stream to run arbitrary actions for messages on the pipeline.
     *  
     *  1 - observable.doAction(observer);
     *  2 - observable.doAction(onNext);
     *  3 - observable.doAction(onNext, onError);
     *  4 - observable.doAction(onNext, onError, onCompleted);
     *  
     *  @param observerOrOnNext Action to invoke for each element in the observable sequence or an observer.
     *  @param {Function} [onError]  Action to invoke upon exceptional termination of the observable sequence. Used if only the observerOrOnNext parameter is also a function.
     *  @param {Function} [onCompleted]  Action to invoke upon graceful termination of the observable sequence. Used if only the observerOrOnNext parameter is also a function.
     *  @return The source sequence with the side-effecting behavior applied.   
     */
    observableProto.doAction = function (observerOrOnNext, onError, onCompleted) {
        var source = this, onNextFunc;
        if (typeof observerOrOnNext === 'function') {
            onNextFunc = observerOrOnNext;
        } else {
            onNextFunc = observerOrOnNext.onNext.bind(observerOrOnNext);
            onError = observerOrOnNext.onError.bind(observerOrOnNext);
            onCompleted = observerOrOnNext.onCompleted.bind(observerOrOnNext);
        }
        return new AnonymousObservable(function (observer) {
            return source.subscribe(function (x) {
                try {
                    onNextFunc(x);
                } catch (e) {
                    observer.onError(e);
                }
                observer.onNext(x);
            }, function (exception) {
                if (!onError) {
                    observer.onError(exception);
                } else {
                    try {
                        onError(exception);
                    } catch (e) {
                        observer.onError(e);
                    }
                    observer.onError(exception);
                }
            }, function () {
                if (!onCompleted) {
                    observer.onCompleted();
                } else {
                    try {
                        onCompleted();
                    } catch (e) {
                        observer.onError(e);
                    }
                    observer.onCompleted();
                }
            });
        });
    };

    /**
     *  Invokes a specified action after the source observable sequence terminates gracefully or exceptionally.
     *  
     *  1 - obs = observable.finallyAction(function () { console.log('sequence ended'; });
     *  
     *  @param finallyAction Action to invoke after the source observable sequence terminates.
     *  @return Source sequence with the action-invoking termination behavior applied. 
     */  
    observableProto.finallyAction = function (action) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var subscription = source.subscribe(observer);
            return disposableCreate(function () {
                try {
                    subscription.dispose();
                } finally {
                    action();
                }
            });
        });
    };

    /**
     *  Ignores all elements in an observable sequence leaving only the termination messages.
     *  
     *  @return An empty observable sequence that signals termination, successful or exceptional, of the source sequence.    
     */
    observableProto.ignoreElements = function () {
        var source = this;
        return new AnonymousObservable(function (observer) {
            return source.subscribe(noop, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    /**
     *  Materializes the implicit notifications of an observable sequence as explicit notification values.
     *  
     *  @return An observable sequence containing the materialized notification values from the source sequence.
     */    
    observableProto.materialize = function () {
        var source = this;
        return new AnonymousObservable(function (observer) {
            return source.subscribe(function (value) {
                observer.onNext(notificationCreateOnNext(value));
            }, function (exception) {
                observer.onNext(notificationCreateOnError(exception));
                observer.onCompleted();
            }, function () {
                observer.onNext(notificationCreateOnCompleted());
                observer.onCompleted();
            });
        });
    };

    /**
     *  Repeats the observable sequence a specified number of times. If the repeat count is not specified, the sequence repeats indefinitely.
     *  
     *  1 - repeated = source.repeat();
     *  2 - repeated = source.repeat(42);
     *  
     *  @param {Number} [repeatCount]  Number of times to repeat the sequence. If not provided, repeats the sequence indefinitely.
     *  @return The observable sequence producing the elements of the given sequence repeatedly.   
     */
    observableProto.repeat = function (repeatCount) {
        return enumerableRepeat(this, repeatCount).concat();
    };

    /**
     *  Repeats the source observable sequence the specified number of times or until it successfully terminates. If the retry count is not specified, it retries indefinitely.
     *  
     *  1 - retried = retry.repeat();
     *  2 - retried = retry.repeat(42);
     *  
     *  @param {Number} [retryCount]  Number of times to retry the sequence. If not provided, retry the sequence indefinitely.
     *  @return An observable sequence producing the elements of the given sequence repeatedly until it terminates successfully. 
     */
    observableProto.retry = function (retryCount) {
        return enumerableRepeat(this, retryCount).catchException();
    };

    /**
     *  Applies an accumulator function over an observable sequence and returns each intermediate result. The optional seed value is used as the initial accumulator value.
     *  For aggregation behavior with no intermediate results, see Observable.aggregate.
     *  
     *  1 - scanned = source.scan(function (acc, x) { return acc + x; });
     *  2 - scanned = source.scan(0, function (acc, x) { return acc + x; });
     *  
     *  @param [seed] The initial accumulator value.
     *  @param accumulator An accumulator function to be invoked on each element.
     *  @return An observable sequence containing the accumulated values.
     */
    observableProto.scan = function () {
        var seed, hasSeed = false, accumulator;
        if (arguments.length === 2) {
            seed = arguments[0];
            accumulator = arguments[1];
            hasSeed = true;
        } else {
            accumulator = arguments[0];
        }
        var source = this;
        return observableDefer(function () {
            var hasAccumulation = false, accumulation;
            return source.select(function (x) {
                if (hasAccumulation) {
                    accumulation = accumulator(accumulation, x);
                } else {
                    accumulation = hasSeed ? accumulator(seed, x) : x;
                    hasAccumulation = true;
                }
                return accumulation;
            });
        });
    };

    /**
     *  Bypasses a specified number of elements at the end of an observable sequence.
     *  
     *  @param count Number of elements to bypass at the end of the source sequence.
     *  @return An observable sequence containing the source sequence elements except for the bypassed ones at the end.
     *  
     *  This operator accumulates a queue with a length enough to store the first <paramref name="count"/> elements. As more elements are
     *  received, elements are taken from the front of the queue and produced on the result sequence. This causes elements to be delayed.
     *        
     */
    observableProto.skipLast = function (count) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var q = [];
            return source.subscribe(function (x) {
                q.push(x);
                if (q.length > count) {
                    observer.onNext(q.shift());
                }
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    /**
     *  Prepends a sequence of values to an observable sequence with an optional scheduler and an argument list of values to prepend.
     *  
     *  1 - source.startWith(1, 2, 3);
     *  2 - source.startWith(Rx.Scheduler.timeout, 1, 2, 3);
     *  
     *  @return The source sequence prepended with the specified values.  
     */
    observableProto.startWith = function () {
        var values, scheduler, start = 0;
        if (arguments.length > 0 && arguments[0] != null && arguments[0].now !== undefined) {
            scheduler = arguments[0];
            start = 1;
        } else {
            scheduler = immediateScheduler;
        }
        values = slice.call(arguments, start);
        return enumerableFor([observableFromArray(values, scheduler), this]).concat();
    };

    /**
     *  Returns a specified number of contiguous elements from the end of an observable sequence, using an optional scheduler to drain the queue.
     *  
     *  1 - obs = source.takeLast(5);
     *  2 - obs = source.takeLast(5, Rx.Scheduler.timeout);
     *  
     *  @param count Number of elements to take from the end of the source sequence.
     *  @param [scheduler] Scheduler used to drain the queue upon completion of the source sequence.
     *  @return An observable sequence containing the specified number of elements from the end of the source sequence.
     *  
     *  This operator accumulates a buffer with a length enough to store elements <paramref name="count"/> elements. Upon completion of
     *  the source sequence, this buffer is drained on the result sequence. This causes the elements to be delayed.
     * 
     */   
    observableProto.takeLast = function (count, scheduler) {
        return this.takeLastBuffer(count).selectMany(function (xs) { return observableFromArray(xs, scheduler); });
    };

    /**
     *  Returns an array with the specified number of contiguous elements from the end of an observable sequence.
     *  
     *  @param count Number of elements to take from the end of the source sequence.
     *  @return An observable sequence containing a single array with the specified number of elements from the end of the source sequence.
     *  
     *  This operator accumulates a buffer with a length enough to store <paramref name="count"/> elements. Upon completion of the
     *  source sequence, this buffer is produced on the result sequence.
     *   
     */
    observableProto.takeLastBuffer = function (count) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var q = [];
            return source.subscribe(function (x) {
                q.push(x);
                if (q.length > count) {
                    q.shift();
                }
            }, observer.onError.bind(observer), function () {
                observer.onNext(q);
                observer.onCompleted();
            });
        });
    };

    /**
     *  Projects each element of an observable sequence into zero or more windows which are produced based on element count information.
     *  
     *  1 - xs.windowWithCount(10);
     *  2 - xs.windowWithCount(10, 1);
     *  
     *  @param count Length of each window.
     *  @param [skip] Number of elements to skip between creation of consecutive windows. If not specified, defaults to the count.
     *  @return An observable sequence of windows.  
     */
    observableProto.windowWithCount = function (count, skip) {
        var source = this;
        if (count <= 0) {
            throw new Error(argumentOutOfRange);
        }
        if (skip == null) {
            skip = count;
        }
        if (skip <= 0) {
            throw new Error(argumentOutOfRange);
        }
        return new AnonymousObservable(function (observer) {
            var m = new SingleAssignmentDisposable(),
                refCountDisposable = new RefCountDisposable(m),
                n = 0,
                q = [],
                createWindow = function () {
                    var s = new Subject();
                    q.push(s);
                    observer.onNext(addRef(s, refCountDisposable));
                };
            createWindow();
            m.setDisposable(source.subscribe(function (x) {
                var s;
                for (var i = 0, len = q.length; i < len; i++) {
                    q[i].onNext(x);
                }
                var c = n - count + 1;
                if (c >= 0 && c % skip === 0) {
                    s = q.shift();
                    s.onCompleted();
                }
                n++;
                if (n % skip === 0) {
                    createWindow();
                }
            }, function (exception) {
                while (q.length > 0) {
                    q.shift().onError(exception);
                }
                observer.onError(exception);
            }, function () {
                while (q.length > 0) {
                    q.shift().onCompleted();
                }
                observer.onCompleted();
            }));
            return refCountDisposable;
        });
    };

    /**
     *  Returns the elements of the specified sequence or the specified value in a singleton sequence if the sequence is empty.
     *  
     *  1 - obs = xs.defaultIfEmpty();
     *  2 - obs = xs.defaultIfEmpty(false);
     *  
     *  @param defaultValue The value to return if the sequence is empty. If not provided, this defaults to null.
     *  @return An observable sequence that contains the specified default value if the source is empty; otherwise, the elements of the source itself. 
     */
    observableProto.defaultIfEmpty = function (defaultValue) {
        var source = this;
        if (defaultValue === undefined) {
            defaultValue = null;
        }
        return new AnonymousObservable(function (observer) {
            var found = false;
            return source.subscribe(function (x) {
                found = true;
                observer.onNext(x);
            }, observer.onError.bind(observer), function () {
                if (!found) {
                    observer.onNext(defaultValue);
                }
                observer.onCompleted();
            });
        });
    };

    /**
     *  Returns an observable sequence that contains only distinct elements according to the keySelector and the comparer.
     *  
     *  1 - obs = xs.distinct();
     *  2 - obs = xs.distinct(function (x) { return x.id; });
     *  2 - obs = xs.distinct(function (x) { return x.id; }, function (x) { return x.toString(); });
     *  
     *  @param {Function} [keySelector]  A function to compute the comparison key for each element.
     *  @param {Function} [keySerializer]  Used to serialize the given object into a string for object comparison.
     *  @return An observable sequence only containing the distinct elements, based on a computed key value, from the source sequence.
     *  Usage of this operator should be considered carefully due to the maintenance of an internal lookup structure which can grow large.   
     */
   observableProto.distinct = function (keySelector, keySerializer) {
        var source = this;
        keySelector || (keySelector = identity);
        keySerializer || (keySerializer = defaultKeySerializer);
        return new AnonymousObservable(function (observer) {
            var hashSet = {};
            return source.subscribe(function (x) {
                var key, serializedKey, otherKey, hasMatch = false;
                try {
                    key = keySelector(x);
                    serializedKey = keySerializer(key);
                } catch (exception) {
                    observer.onError(exception);
                    return;
                }
                for (otherKey in hashSet) {
                    if (serializedKey === otherKey) {
                        hasMatch = true;
                        break;
                    }
                }
                if (!hasMatch) {
                    hashSet[serializedKey] = null;
                    observer.onNext(x);
                }
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    /**
     *  Groups the elements of an observable sequence according to a specified key selector function and comparer and selects the resulting elements by using a specified function.
     *  
     *  1 - observable.groupBy(function (x) { return x.id; });
     *  2 - observable.groupBy(function (x) { return x.id; }), function (x) { return x.name; });
     *  3 - observable.groupBy(function (x) { return x.id; }), function (x) { return x.name; }, function (x) { return x.toString(); });
     *  
     *  @param keySelector A function to extract the key for each element.
     *  @param {Function} [elementSelector]  A function to map each source element to an element in an observable group.
     *  @param {Function} [keySerializer]  Used to serialize the given object into a string for object comparison.
     *  @return A sequence of observable groups, each of which corresponds to a unique key value, containing all elements that share that same key value.    
     */
    observableProto.groupBy = function (keySelector, elementSelector, keySerializer) {
        return this.groupByUntil(keySelector, elementSelector, function () {
            return observableNever();
        }, keySerializer);
    };

    /**
     *  Groups the elements of an observable sequence according to a specified key selector function.
     *  A duration selector function is used to control the lifetime of groups. When a group expires, it receives an OnCompleted notification. When a new element with the same
     *  key value as a reclaimed group occurs, the group will be reborn with a new lifetime request.
     *  
     *  1 - observable.groupByUntil(function (x) { return x.id; }, null,  function () { return Rx.Observable.never(); });
     *  2 - observable.groupBy(function (x) { return x.id; }), function (x) { return x.name; },  function () { return Rx.Observable.never(); });
     *  3 - observable.groupBy(function (x) { return x.id; }), function (x) { return x.name; },  function () { return Rx.Observable.never(); }, function (x) { return x.toString(); });
     *  
     *  @param keySelector A function to extract the key for each element.
     *  @param durationSelector A function to signal the expiration of a group.
     *  @param {Function} [keySerializer]  Used to serialize the given object into a string for object comparison.
     *  @return 
     *  A sequence of observable groups, each of which corresponds to a unique key value, containing all elements that share that same key value.
     *  If a group's lifetime expires, a new group with the same key value can be created once an element with such a key value is encoutered.
     *      
     */
    observableProto.groupByUntil = function (keySelector, elementSelector, durationSelector, keySerializer) {
        var source = this;
        elementSelector || (elementSelector = identity);
        keySerializer || (keySerializer = defaultKeySerializer);
        return new AnonymousObservable(function (observer) {
            var map = {},
                groupDisposable = new CompositeDisposable(),
                refCountDisposable = new RefCountDisposable(groupDisposable);
            groupDisposable.add(source.subscribe(function (x) {
                var duration, durationGroup, element, expire, fireNewMapEntry, group, key, serializedKey, md, writer, w;
                try {
                    key = keySelector(x);
                    serializedKey = keySerializer(key);
                } catch (e) {
                    for (w in map) {
                        map[w].onError(e);
                    }
                    observer.onError(e);
                    return;
                }
                fireNewMapEntry = false;
                try {
                    writer = map[serializedKey];
                    if (!writer) {
                        writer = new Subject();
                        map[serializedKey] = writer;
                        fireNewMapEntry = true;
                    }
                } catch (e) {
                    for (w in map) {
                        map[w].onError(e);
                    }
                    observer.onError(e);
                    return;
                }
                if (fireNewMapEntry) {
                    group = new GroupedObservable(key, writer, refCountDisposable);
                    durationGroup = new GroupedObservable(key, writer);
                    try {
                        duration = durationSelector(durationGroup);
                    } catch (e) {
                        for (w in map) {
                            map[w].onError(e);
                        }
                        observer.onError(e);
                        return;
                    }
                    observer.onNext(group);
                    md = new SingleAssignmentDisposable();
                    groupDisposable.add(md);
                    expire = function () {
                        if (serializedKey in map) {
                            delete map[serializedKey];
                            writer.onCompleted();
                        }
                        groupDisposable.remove(md);
                    };
                    md.setDisposable(duration.take(1).subscribe(noop, function (exn) {
                        for (w in map) {
                            map[w].onError(exn);
                        }
                        observer.onError(exn);
                    }, function () {
                        expire();
                    }));
                }
                try {
                    element = elementSelector(x);
                } catch (e) {
                    for (w in map) {
                        map[w].onError(e);
                    }
                    observer.onError(e);
                    return;
                }
                writer.onNext(element);
            }, function (ex) {
                for (var w in map) {
                    map[w].onError(ex);
                }
                observer.onError(ex);
            }, function () {
                for (var w in map) {
                    map[w].onCompleted();
                }
                observer.onCompleted();
            }));
            return refCountDisposable;
        });
    };

    /**
     *  Projects each element of an observable sequence into a new form by incorporating the element's index.
     *  
     *  1 - source.select(function (value) { return value * value; });
     *  2 - source.select(function (value, index) { return value * value + index; });
     *  
     *  @param {Function} selector A transform function to apply to each source element; the second parameter of the function represents the index of the source element.
     *  @return An observable sequence whose elements are the result of invoking the transform function on each element of source. 
     */
    observableProto.select = observableProto.map = function (selector) {
        var parent = this;
        return new AnonymousObservable(function (observer) {
            var count = 0;
            return parent.subscribe(function (value) {
                var result;
                try {
                    result = selector(value, count++);
                } catch (exception) {
                    observer.onError(exception);
                    return;
                }
                observer.onNext(result);
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    function selectMany(selector) {
        return this.select(selector).mergeObservable();
    }

    /**
     *  One of the Following:
     *  Projects each element of an observable sequence to an observable sequence and merges the resulting observable sequences into one observable sequence.
     *  
     *  1 - source.selectMany(function (x) { return Rx.Observable.range(0, x); });
     *  Or:
     *  Projects each element of an observable sequence to an observable sequence, invokes the result selector for the source element and each of the corresponding inner sequence's elements, and merges the results into one observable sequence.
     *  
     *  1 - source.selectMany(function (x) { return Rx.Observable.range(0, x); }, function (x, y) { return x + y; });
     *  Or:
     *  Projects each element of the source observable sequence to the other observable sequence and merges the resulting observable sequences into one observable sequence.
     *  
     *  1 - source.selectMany(Rx.Observable.fromArray([1,2,3]));
     *  
     *  @param selector A transform function to apply to each element or an observable sequence to project each element from the source sequence onto.
     *  @param {Function} [resultSelector]  A transform function to apply to each element of the intermediate sequence.
     *  @return An observable sequence whose elements are the result of invoking the one-to-many transform function collectionSelector on each element of the input sequence and then mapping each of those sequence elements and their corresponding source element to a result element.   
     */
    observableProto.selectMany = observableProto.flatMap = function (selector, resultSelector) {
        if (resultSelector) {
            return this.selectMany(function (x) {
                return selector(x).select(function (y) {
                    return resultSelector(x, y);
                });
            });
        }
        if (typeof selector === 'function') {
            return selectMany.call(this, selector);
        }
        return selectMany.call(this, function () {
            return selector;
        });
    };

    /**
     *  Bypasses a specified number of elements in an observable sequence and then returns the remaining elements.
     *  
     *  @param count The number of elements to skip before returning the remaining elements.
     *  @return An observable sequence that contains the elements that occur after the specified index in the input sequence.   
     */
    observableProto.skip = function (count) {
        if (count < 0) {
            throw new Error(argumentOutOfRange);
        }
        var observable = this;
        return new AnonymousObservable(function (observer) {
            var remaining = count;
            return observable.subscribe(function (x) {
                if (remaining <= 0) {
                    observer.onNext(x);
                } else {
                    remaining--;
                }
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    /**
     *  Bypasses elements in an observable sequence as long as a specified condition is true and then returns the remaining elements.
     *  The element's index is used in the logic of the predicate function.
     *  
     *  1 - source.skipWhile(function (value) { return value < 10; });
     *  1 - source.skipWhile(function (value, index) { return value < 10 || index < 10; });
     *  
     *  @param predicate A function to test each element for a condition; the second parameter of the function represents the index of the source element.
     *  @return An observable sequence that contains the elements from the input sequence starting at the first element in the linear series that does not pass the test specified by predicate.   
     */
    observableProto.skipWhile = function (predicate) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var i = 0, running = false;
            return source.subscribe(function (x) {
                if (!running) {
                    try {
                        running = !predicate(x, i++);
                    } catch (e) {
                        observer.onError(e);
                        return;
                    }
                }
                if (running) {
                    observer.onNext(x);
                }
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    /**
     *  Returns a specified number of contiguous elements from the start of an observable sequence, using the specified scheduler for the edge case of take(0).
     *  
     *  1 - source.take(5);
     *  2 - source.take(0, Rx.Scheduler.timeout);
     *  
     *  @param {Number} count The number of elements to return.
     *  @param [scheduler] Scheduler used to produce an OnCompleted message in case <paramref name="count count</paramref> is set to 0.
     *  @return An observable sequence that contains the specified number of elements from the start of the input sequence.  
     */
    observableProto.take = function (count, scheduler) {
        if (count < 0) {
            throw new Error(argumentOutOfRange);
        }
        if (count === 0) {
            return observableEmpty(scheduler);
        }
        var observable = this;
        return new AnonymousObservable(function (observer) {
            var remaining = count;
            return observable.subscribe(function (x) {
                if (remaining > 0) {
                    remaining--;
                    observer.onNext(x);
                    if (remaining === 0) {
                        observer.onCompleted();
                    }
                }
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    /**
     *  Returns elements from an observable sequence as long as a specified condition is true.
     *  The element's index is used in the logic of the predicate function.
     *  
     *  1 - source.takeWhile(function (value) { return value < 10; });
     *  1 - source.takeWhile(function (value, index) { return value < 10 || index < 10; });
     *  
     *  @param {Function} predicate A function to test each element for a condition; the second parameter of the function represents the index of the source element.
     *  @return An observable sequence that contains the elements from the input sequence that occur before the element at which the test no longer passes.  
     */
    observableProto.takeWhile = function (predicate) {
        var observable = this;
        return new AnonymousObservable(function (observer) {
            var i = 0, running = true;
            return observable.subscribe(function (x) {
                if (running) {
                    try {
                        running = predicate(x, i++);
                    } catch (e) {
                        observer.onError(e);
                        return;
                    }
                    if (running) {
                        observer.onNext(x);
                    } else {
                        observer.onCompleted();
                    }
                }
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };

    /**
     *  Filters the elements of an observable sequence based on a predicate by incorporating the element's index.
     *  
     *  1 - source.where(function (value) { return value < 10; });
     *  1 - source.where(function (value, index) { return value < 10 || index < 10; });
     *  
     *  @param {Function} predicate A function to test each source element for a conditio; the second parameter of the function represents the index of the source element.
     *  @return An observable sequence that contains elements from the input sequence that satisfy the condition.   
     */
    observableProto.where = observableProto.filter = function (predicate) {
        var parent = this;
        return new AnonymousObservable(function (observer) {
            var count = 0;
            return parent.subscribe(function (value) {
                var shouldRun;
                try {
                    shouldRun = predicate(value, count++);
                } catch (exception) {
                    observer.onError(exception);
                    return;
                }
                if (shouldRun) {
                    observer.onNext(value);
                }
            }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
        });
    };
    var AnonymousObservable = root.Internals.AnonymousObservable = (function () {
        inherits(AnonymousObservable, Observable);
        function AnonymousObservable(subscribe) {

            var s = function (observer) {
                var autoDetachObserver = new AutoDetachObserver(observer);
                if (currentThreadScheduler.scheduleRequired()) {
                    currentThreadScheduler.schedule(function () {
                        try {
                            autoDetachObserver.disposable(subscribe(autoDetachObserver));
                        } catch (e) {
                            if (!autoDetachObserver.fail(e)) {
                                throw e;
                            } 
                        }
                    });
                } else {
                    try {
                        autoDetachObserver.disposable(subscribe(autoDetachObserver));
                    } catch (e) {
                        if (!autoDetachObserver.fail(e)) {
                            throw e;
                        }
                    }
                }

                return autoDetachObserver;
            };
            AnonymousObservable.super_.constructor.call(this, s);
        }

        return AnonymousObservable;
    }());

    var AutoDetachObserver = (function () {

        inherits(AutoDetachObserver, AbstractObserver);
        function AutoDetachObserver(observer) {
            AutoDetachObserver.super_.constructor.call(this);
            this.observer = observer;
            this.m = new SingleAssignmentDisposable();
        }

        AutoDetachObserver.prototype.next = function (value) {
            var noError = false;
            try {
                this.observer.onNext(value);
                noError = true;
            } finally {
                if (!noError) {
                    this.dispose();
                }
            }
        };
        AutoDetachObserver.prototype.error = function (exn) {
            try {
                this.observer.onError(exn);
            } finally {
                this.dispose();
            }
        };
        AutoDetachObserver.prototype.completed = function () {
            try {
                this.observer.onCompleted();
            } finally {
                this.dispose();
            }
        };
        AutoDetachObserver.prototype.disposable = function (value) {
            return this.m.disposable(value);
        };
        AutoDetachObserver.prototype.dispose = function () {
            AutoDetachObserver.super_.dispose.call(this);
            this.m.dispose();
        };

        return AutoDetachObserver;
    }());

    var GroupedObservable = (function () {
        function subscribe(observer) {
            return this.underlyingObservable.subscribe(observer);
        }

        inherits(GroupedObservable, Observable);
        function GroupedObservable(key, underlyingObservable, mergedDisposable) {
            GroupedObservable.super_.constructor.call(this, subscribe);
            this.key = key;
            this.underlyingObservable = !mergedDisposable ?
                underlyingObservable :
                new AnonymousObservable(function (observer) {
                    return new CompositeDisposable(mergedDisposable.getDisposable(), underlyingObservable.subscribe(observer));
                });
        }
        return GroupedObservable;
    }());

    var InnerSubscription = function (subject, observer) {
        this.subject = subject;
        this.observer = observer;
    };
    InnerSubscription.prototype.dispose = function () {
        if (!this.subject.isDisposed && this.observer !== null) {
            var idx = this.subject.observers.indexOf(this.observer);
            this.subject.observers.splice(idx, 1);
            this.observer = null;
        }
    };

    /**
     *  Represents an object that is both an observable sequence as well as an observer.
     *  Each notification is broadcasted to all subscribed observers.
     */
    var Subject = root.Subject = (function () {
        function subscribe(observer) {
            checkDisposed.call(this);
            if (!this.isStopped) {
                this.observers.push(observer);
                return new InnerSubscription(this, observer);
            }
            if (this.exception) {
                observer.onError(this.exception);
                return disposableEmpty;
            }
            observer.onCompleted();
            return disposableEmpty;
        }

        inherits(Subject, Observable);

        /**
         * @constructor
         * Creates a subject.
         */      
        function Subject() {
            Subject.super_.constructor.call(this, subscribe);
            this.isDisposed = false,
            this.isStopped = false,
            this.observers = [];
        }

        addProperties(Subject.prototype, Observer, {
            onCompleted: function () {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var os = this.observers.slice(0);
                    this.isStopped = true;
                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onCompleted();
                    }

                    this.observers = [];
                }
            },
            onError: function (exception) {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var os = this.observers.slice(0);
                    this.isStopped = true;
                    this.exception = exception;
                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onError(exception);
                    }

                    this.observers = [];
                }
            },
            onNext: function (value) {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var os = this.observers.slice(0);
                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onNext(value);
                    }
                }
            },
            dispose: function () {
                this.isDisposed = true;
                this.observers = null;
            }
        });

        Subject.create = function (observer, observable) {
            return new AnonymousSubject(observer, observable);
        };

        return Subject;
    }());

    /**
     *  Represents the result of an asynchronous operation.
     *  The last value before the OnCompleted notification, or the error received through OnError, is sent to all subscribed observers.
     */   
    var AsyncSubject = root.AsyncSubject = (function () {

        function subscribe(observer) {
            checkDisposed.call(this);
            if (!this.isStopped) {
                this.observers.push(observer);
                return new InnerSubscription(this, observer);
            }
            var ex = this.exception;
            var hv = this.hasValue;
            var v = this.value;
            if (ex) {
                observer.onError(ex);
            } else if (hv) {
                observer.onNext(v);
                observer.onCompleted();
            } else {
                observer.onCompleted();
            }
            return disposableEmpty;
        }

        inherits(AsyncSubject, Observable);

        /**
         * @constructor
         * Creates a subject that can only receive one value and that value is cached for all future observations.
         */ 
        function AsyncSubject() {
            AsyncSubject.super_.constructor.call(this, subscribe);

            this.isDisposed = false,
            this.isStopped = false,
            this.value = null,
            this.hasValue = false,
            this.observers = [],
            this.exception = null;
        }

        addProperties(AsyncSubject.prototype, Observer, {
            onCompleted: function () {
                var o, i, len;
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var os = this.observers.slice(0);
                    this.isStopped = true;
                    var v = this.value;
                    var hv = this.hasValue;

                    if (hv) {
                        for (i = 0, len = os.length; i < len; i++) {
                            o = os[i];
                            o.onNext(v);
                            o.onCompleted();
                        }
                    } else {
                        for (i = 0, len = os.length; i < len; i++) {
                            os[i].onCompleted();
                        }
                    }

                    this.observers = [];
                }
            },
            onError: function (exception) {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var os = this.observers.slice(0);
                    this.isStopped = true;
                    this.exception = exception;

                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onError(exception);
                    }

                    this.observers = [];
                }
            },
            onNext: function (value) {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    this.value = value;
                    this.hasValue = true;
                }
            },
            dispose: function () {
                this.isDisposed = true;
                this.observers = null;
                this.exception = null;
                this.value = null;
            }
        });

        return AsyncSubject;
    }());

    var AnonymousSubject = (function () {
        function subscribe(observer) {
            return this.observable.subscribe(observer);
        }

        inherits(AnonymousSubject, Observable);
        function AnonymousSubject(observer, observable) {
            AnonymousSubject.super_.constructor.call(this, subscribe);
            this.observer = observer;
            this.observable = observable;
        }

        addProperties(AnonymousSubject.prototype, Observer, {
            onCompleted: function () {
                this.observer.onCompleted();
            },
            onError: function (exception) {
                this.observer.onError(exception);
            },
            onNext: function (value) {
                this.observer.onNext(value);
            }
        });

        return AnonymousSubject;
    }());

    // Check for AMD
    if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
        window.Rx = root;
        return define(function () {
            return root;
        });
    } else if (freeExports) {
        if (typeof module == 'object' && module && module.exports == freeExports) {
            module.exports = root;
        } else {
            freeExports = root;
        }
    } else {
        window.Rx = root;
    }
}(this));
//
// Module: map
//

define.names.push("map");
/// <reference path="rxextensions.d.ts" />
define(["require", "exports", "../ext/rx", "../ext/msfuncy-0.9"], function(require, exports, rx, _) {
    var asrtStrOrArray = _.asrtion(function (arg) {
        return _.isArray(arg) || _.isString(arg);
    }, "must be string or array");

    var asrtLengthGtZero = _.asrtion(function (arg) {
        return _.getLength(arg) > 0;
    }, "length must be greater than zero");

    

    

    

    

    // Factory function composition.
    exports.propMap = _.explain("map", _.pre(_.explain("source", _.pipe(asrtStrOrArray, asrtLengthGtZero)), _.explain("[target]", _.asrtion(_.isUndefOr(_.isString), "must be string if specified")), _.explain("[converter]", _.dflt(_.arg, _.asrtion(_.isUndefOr(_.isFunc), "must be function if specified"))), // Factory function that creates select property maps.
    function (sources, target, mapper) {
        // Creates a function with getNames, getAlias and converter
        // methods.
        var wrappedSources = _.wrap(sources), checkedTarget = target || wrappedSources[0], wrappedMapper = _.isArray(sources) ? _.unsplat(mapper) : mapper;
        return _.pipe(_.setter("getSources", _.k(wrappedSources.slice(0))), _.setter("getTarget", _.k(checkedTarget)), _.setter("getMapper", _.k(mapper)))(_.explain("Map source members '" + wrappedSources.join("', '") + "' into target member '" + checkedTarget + "'", function (source, destination) {
            return _.set(checkedTarget, _.extract(wrappedMapper, wrappedSources, source), destination);
        }));
    }));

    /**
    * Fetches all select properties from the list of maps.
    *
    * @param maps The list of maps to get select properties from.
    */
    function getSourceNames(maps) {
        return _.aggregate(_.map(function (map) {
            return map.getSources();
        }, maps), _.cat, []).sort().join(",");
    }
    exports.getSourceNames = getSourceNames;

    /**
    * Maps the specified properties of a source object to a new target object.
    *
    * @param maps The maps to use in the mapping operation.
    */
    rx.Observable.prototype.propmap = function (maps) {
        var parent = this, asyncMaps = maps.filter(function (map) {
            return map.subscribe;
        }), syncMaps = maps.filter(function (map) {
            return !map.subscribe;
        }), observable = rx.Observable;
        return observable.createWithDisposable(function (obs) {
            return parent.selectMany(function (item) {
                return observable.merge(asyncMaps).merge(observable.fromArray(syncMaps)).scan({}, function (acc, map) {
                    return map(item, acc);
                }).takeLast(1);
            }).subscribe(obs);
        });
    };
});

//
// Module: ../ext/rx.time
//

define.names.push("../ext/rx.time");
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.txt in the project root for license information.

(function (root, factory) {
    var freeExports = typeof exports == 'object' && exports &&
    (typeof root == 'object' && root && root == root.global && (window = root), exports);

    // Because of build optimizers
    if (typeof define === 'function' && define.amd) {
        define(['../ext/rx', 'exports'], function (Rx, exports) {
            root.Rx = factory(root, exports, Rx);
            return root.Rx;
        });
    } else if (typeof module == 'object' && module && module.exports == freeExports) {
        module.exports = factory(root, module.exports, require('./rx'));
    } else {
        root.Rx = factory(root, {}, root.Rx);
    }
}(this, function (global, exp, root, undefined) {
    
    // Refernces
    var Observable = root.Observable,
        observableProto = Observable.prototype,
        AnonymousObservable = root.Internals.AnonymousObservable,
        observableDefer = Observable.defer,
        observableEmpty = Observable.empty,
        observableThrow = Observable.throwException,
        observableFromArray = Observable.fromArray,
        timeoutScheduler = root.Scheduler.timeout,
        SingleAssignmentDisposable = root.SingleAssignmentDisposable,
        SerialDisposable = root.SerialDisposable,
        CompositeDisposable = root.CompositeDisposable,
        RefCountDisposable = root.RefCountDisposable,
        Subject = root.Subject,
        BinaryObserver = root.Internals.BinaryObserver,
        addRef = root.Internals.addRef,
        normalizeTime = root.Scheduler.normalize;

    function observableTimerDate(dueTime, scheduler) {
        return new AnonymousObservable(function (observer) {
            return scheduler.scheduleWithAbsolute(dueTime, function () {
                observer.onNext(0);
                observer.onCompleted();
            });
        });
    }

    function observableTimerDateAndPeriod(dueTime, period, scheduler) {
        var p = normalizeTime(period);
        return new AnonymousObservable(function (observer) {
            var count = 0, d = dueTime;
            return scheduler.scheduleRecursiveWithAbsolute(d, function (self) {
                var now;
                if (p > 0) {
                    now = scheduler.now();
                    d = d + p;
                    if (d <= now) {
                        d = now + p;
                    }
                }
                observer.onNext(count++);
                self(d);
            });
        });
    };

    function observableTimerTimeSpan(dueTime, scheduler) {
        var d = normalizeTime(dueTime);
        return new AnonymousObservable(function (observer) {
            return scheduler.scheduleWithRelative(d, function () {
                observer.onNext(0);
                observer.onCompleted();
            });
        });
    };

    function observableTimerTimeSpanAndPeriod(dueTime, period, scheduler) {
        if (dueTime === period) {
            return new AnonymousObservable(function (observer) {
                return scheduler.schedulePeriodicWithState(0, period, function (count) {
                    observer.onNext(count);
                    return count + 1;
                });
            });
        }
        return observableDefer(function () {
            return observableTimerDateAndPeriod(scheduler.now() + dueTime, period, scheduler);
        });
    };

    /**
     *  Returns an observable sequence that produces a value after each period.
     *  
     *  1 - res = Rx.Observable.interval(1000);
     *  2 - res = Rx.Observable.interval(1000, Rx.Scheduler.timeout);
     *  
     *  @param period Period for producing the values in the resulting sequence (specified as an integer denoting milliseconds).
     *  @param [scheduler] Scheduler to run the timer on. If not specified, Rx.Scheduler.timeout is used.
     *  @return An observable sequence that produces a value after each period.
     */
    var observableinterval = Observable.interval = function (period, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        return observableTimerTimeSpanAndPeriod(period, period, scheduler);
    };

    /**
     *  Returns an observable sequence that produces a value after dueTime has elapsed and then after each period.
     *  
     *  1 - res = Rx.Observable.timer(new Date());
     *  2 - res = Rx.Observable.timer(new Date(), 1000);
     *  3 - res = Rx.Observable.timer(new Date(), Rx.Scheduler.timeout);
     *  4 - res = Rx.Observable.timer(new Date(), 1000, Rx.Scheduler.timeout);
     *  
     *  5 - res = Rx.Observable.timer(5000);
     *  6 - res = Rx.Observable.timer(5000, 1000);
     *  7 - res = Rx.Observable.timer(5000, Rx.Scheduler.timeout);
     *  8 - res = Rx.Observable.timer(5000, 1000, Rx.Scheduler.timeout);
     *  
     *  @param dueTime Absolute (specified as a Date object) or relative time (specified as an integer denoting milliseconds) at which to produce the first value.
     *  @param [periodOrScheduler]  Period to produce subsequent values (specified as an integer denoting milliseconds), or the scheduler to run the timer on. If not specified, the resulting timer is not recurring.
     *  @param [scheduler]  Scheduler to run the timer on. If not specified, the timeout scheduler is used.
     *  @return An observable sequence that produces a value after due time has elapsed and then each period.
     */
    var observableTimer = Observable.timer = function (dueTime, periodOrScheduler, scheduler) {
        var period;
        scheduler || (scheduler = timeoutScheduler);
        if (periodOrScheduler !== undefined && typeof periodOrScheduler === 'number') {
            period = periodOrScheduler;
        } else if (periodOrScheduler !== undefined && typeof periodOrScheduler === 'object') {
            scheduler = periodOrScheduler;
        }
        if (dueTime instanceof Date && period === undefined) {
            return observableTimerDate(dueTime.getTime(), scheduler);
        }
        if (dueTime instanceof Date && period !== undefined) {
            period = periodOrScheduler;
            return observableTimerDateAndPeriod(dueTime.getTime(), period, scheduler);
        }
        if (period === undefined) {
            return observableTimerTimeSpan(dueTime, scheduler);
        }
        return observableTimerTimeSpanAndPeriod(dueTime, period, scheduler);
    };

    function observableDelayTimeSpan(dueTime, scheduler) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var active = false,
                cancelable = new SerialDisposable(),
                exception = null,
                q = [],
                running = false,
                subscription;
            subscription = source.materialize().timestamp(scheduler).subscribe(function (notification) {
                var d, shouldRun;
                if (notification.value.kind === 'E') {
                    q = [];
                    q.push(notification);
                    exception = notification.value.exception;
                    shouldRun = !running;
                } else {
                    q.push({ value: notification.value, timestamp: notification.timestamp + dueTime });
                    shouldRun = !active;
                    active = true;
                }
                if (shouldRun) {
                    if (exception !== null) {
                        observer.onError(exception);
                    } else {
                        d = new SingleAssignmentDisposable();
                        cancelable.disposable(d);
                        d.disposable(scheduler.scheduleRecursiveWithRelative(dueTime, function (self) {
                            var e, recurseDueTime, result, shouldRecurse;
                            if (exception !== null) {
                                return;
                            }
                            running = true;
                            do {
                                result = null;
                                if (q.length > 0 && q[0].timestamp - scheduler.now() <= 0) {
                                    result = q.shift().value;
                                }
                                if (result !== null) {
                                    result.accept(observer);
                                }
                            } while (result !== null);
                            shouldRecurse = false;
                            recurseDueTime = 0;
                            if (q.length > 0) {
                                shouldRecurse = true;
                                recurseDueTime = Math.max(0, q[0].timestamp - scheduler.now());
                            } else {
                                active = false;
                            }
                            e = exception;
                            running = false;
                            if (e !== null) {
                                observer.onError(e);
                            } else if (shouldRecurse) {
                                self(recurseDueTime);
                            }
                        }));
                    }
                }
            });
            return new CompositeDisposable(subscription, cancelable);
        });
    };

    function observableDelayDate(dueTime, scheduler) {
        var self = this;
        return observableDefer(function () {
            var timeSpan = dueTime - scheduler.now();
            return observableDelayTimeSpan.call(self, timeSpan, scheduler);
        });
    }

    /**
     *  Time shifts the observable sequence by dueTime. The relative time intervals between the values are preserved.
     *  
     *  1 - res = Rx.Observable.timer(new Date());
     *  2 - res = Rx.Observable.timer(new Date(), Rx.Scheduler.timeout);
     *  
     *  3 - res = Rx.Observable.delay(5000);
     *  4 - res = Rx.Observable.delay(5000, 1000, Rx.Scheduler.timeout);
     *  
     *  @param dueTime Absolute (specified as a Date object) or relative time (specified as an integer denoting milliseconds) by which to shift the observable sequence.
     *  @param [scheduler]  Scheduler to run the delay timers on. If not specified, the timeout scheduler is used.
     *  @return Time-shifted sequence.
     */
    observableProto.delay = function (dueTime, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        return dueTime instanceof Date ?
            observableDelayDate.call(this, dueTime.getTime(), scheduler) :
            observableDelayTimeSpan.call(this, dueTime, scheduler);
    };

    /**
     *  Ignores values from an observable sequence which are followed by another value before dueTime.
     *  
     *  1 - res = source.throttle(5000); // 5 seconds
     *  2 - res = source.throttle(5000, scheduler);        
     *  
     *  @param dueTime Duration of the throttle period for each value (specified as an integer denoting milliseconds).
     *  @param [scheduler]  Scheduler to run the throttle timers on. If not specified, the timeout scheduler is used.
     *  @return The throttled sequence.
     */
    observableProto.throttle = function (dueTime, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        var source = this;
        return new AnonymousObservable(function (observer) {
            var cancelable = new SerialDisposable(), hasvalue = false, id = 0, subscription, value = null;
            subscription = source.subscribe(function (x) {
                var currentId, d;
                hasvalue = true;
                value = x;
                id++;
                currentId = id;
                d = new SingleAssignmentDisposable();
                cancelable.disposable(d);
                d.disposable(scheduler.scheduleWithRelative(dueTime, function () {
                    if (hasvalue && id === currentId) {
                        observer.onNext(value);
                    }
                    hasvalue = false;
                }));
            }, function (exception) {
                cancelable.dispose();
                observer.onError(exception);
                hasvalue = false;
                id++;
            }, function () {
                cancelable.dispose();
                if (hasvalue) {
                    observer.onNext(value);
                }
                observer.onCompleted();
                hasvalue = false;
                id++;
            });
            return new CompositeDisposable(subscription, cancelable);
        });
    };

    /**
     *  Projects each element of an observable sequence into zero or more windows which are produced based on timing information.
     *  
     *  1 - res = xs.windowWithTime(1000, scheduler); // non-overlapping segments of 1 second
     *  2 - res = xs.windowWithTime(1000, 500 , scheduler); // segments of 1 second with time shift 0.5 seconds
     *  
     *  @param timeSpan Length of each window (specified as an integer denoting milliseconds).
     *  @param [timeShiftOrScheduler]  Interval between creation of consecutive windows (specified as an integer denoting milliseconds), or an optional scheduler parameter. If not specified, the time shift corresponds to the timeSpan parameter, resulting in non-overlapping adjacent windows.
     *  @param [scheduler]  Scheduler to run windowing timers on. If not specified, the timeout scheduler is used.
     *  @return An observable sequence of windows.
     */
    observableProto.windowWithTime = function (timeSpan, timeShiftOrScheduler, scheduler) {
        var source = this, timeShift;
        if (timeShiftOrScheduler === undefined) {
            timeShift = timeSpan;
        }
        if (scheduler === undefined) {
            scheduler = timeoutScheduler;
        }
        if (typeof timeShiftOrScheduler === 'number') {
            timeShift = timeShiftOrScheduler;
        } else if (typeof timeShiftOrScheduler === 'object') {
            timeShift = timeSpan;
            scheduler = timeShiftOrScheduler;
        }
        return new AnonymousObservable(function (observer) {
            var createTimer,
                groupDisposable,
                nextShift = timeShift,
                nextSpan = timeSpan,
                q = [],
                refCountDisposable,
                timerD = new SerialDisposable(),
                totalTime = 0;
            groupDisposable = new CompositeDisposable(timerD);
            refCountDisposable = new RefCountDisposable(groupDisposable);
            createTimer = function () {
                var isShift, isSpan, m, newTotalTime, ts;
                m = new SingleAssignmentDisposable();
                timerD.disposable(m);
                isSpan = false;
                isShift = false;
                if (nextSpan === nextShift) {
                    isSpan = true;
                    isShift = true;
                } else if (nextSpan < nextShift) {
                    isSpan = true;
                } else {
                    isShift = true;
                }
                newTotalTime = isSpan ? nextSpan : nextShift;
                ts = newTotalTime - totalTime;
                totalTime = newTotalTime;
                if (isSpan) {
                    nextSpan += timeShift;
                }
                if (isShift) {
                    nextShift += timeShift;
                }
                m.disposable(scheduler.scheduleWithRelative(ts, function () {
                    var s;
                    if (isShift) {
                        s = new Subject();
                        q.push(s);
                        observer.onNext(addRef(s, refCountDisposable));
                    }
                    if (isSpan) {
                        s = q.shift();
                        s.onCompleted();
                    }
                    createTimer();
                }));
            };
            q.push(new Subject());
            observer.onNext(addRef(q[0], refCountDisposable));
            createTimer();
            groupDisposable.add(source.subscribe(function (x) {
                var i, s;
                for (i = 0; i < q.length; i++) {
                    s = q[i];
                    s.onNext(x);
                }
            }, function (e) {
                var i, s;
                for (i = 0; i < q.length; i++) {
                    s = q[i];
                    s.onError(e);
                }
                observer.onError(e);
            }, function () {
                var i, s;
                for (i = 0; i < q.length; i++) {
                    s = q[i];
                    s.onCompleted();
                }
                observer.onCompleted();
            }));
            return refCountDisposable;
        });
    };

    /**
     *  Projects each element of an observable sequence into a window that is completed when either it's full or a given amount of time has elapsed.
     *  
     *  1 - res = source.windowWithTimeOrCount(5000, 50); // 5s or 50 items
     *  2 - res = source.windowWithTimeOrCount(5000, 50, scheduler); //5s or 50 items
     *  
     *  @param timeSpan Maximum time length of a window.
     *  @param count Maximum element count of a window.
     *  @param [scheduler]  Scheduler to run windowing timers on. If not specified, the timeout scheduler is used.
     *  @return An observable sequence of windows.
     */
    observableProto.windowWithTimeOrCount = function (timeSpan, count, scheduler) {
        var source = this;
        scheduler || (scheduler = timeoutScheduler);
        return new AnonymousObservable(function (observer) {
            var createTimer,
                groupDisposable,
                n = 0,
                refCountDisposable,
                s,
                timerD = new SerialDisposable(),
                windowId = 0;
            groupDisposable = new CompositeDisposable(timerD);
            refCountDisposable = new RefCountDisposable(groupDisposable);
            createTimer = function (id) {
                var m = new SingleAssignmentDisposable();
                timerD.disposable(m);
                m.disposable(scheduler.scheduleWithRelative(timeSpan, function () {
                    var newId;
                    if (id !== windowId) {
                        return;
                    }
                    n = 0;
                    newId = ++windowId;
                    s.onCompleted();
                    s = new Subject();
                    observer.onNext(addRef(s, refCountDisposable));
                    createTimer(newId);
                }));
            };
            s = new Subject();
            observer.onNext(addRef(s, refCountDisposable));
            createTimer(0);
            groupDisposable.add(source.subscribe(function (x) {
                var newId = 0, newWindow = false;
                s.onNext(x);
                n++;
                if (n === count) {
                    newWindow = true;
                    n = 0;
                    newId = ++windowId;
                    s.onCompleted();
                    s = new Subject();
                    observer.onNext(addRef(s, refCountDisposable));
                }
                if (newWindow) {
                    createTimer(newId);
                }
            }, function (e) {
                s.onError(e);
                observer.onError(e);
            }, function () {
                s.onCompleted();
                observer.onCompleted();
            }));
            return refCountDisposable;
        });
    };

    /**
     *  Projects each element of an observable sequence into zero or more buffers which are produced based on timing information.
     *  
     *  1 - res = xs.bufferWithTime(1000, scheduler); // non-overlapping segments of 1 second
     *  2 - res = xs.bufferWithTime(1000, 500, scheduler; // segments of 1 second with time shift 0.5 seconds
     *  
     *  @param timeSpan Length of each buffer (specified as an integer denoting milliseconds).
     *  @param [timeShiftOrScheduler]  Interval between creation of consecutive buffers (specified as an integer denoting milliseconds), or an optional scheduler parameter. If not specified, the time shift corresponds to the timeSpan parameter, resulting in non-overlapping adjacent buffers.
     *  @param [scheduler]  Scheduler to run buffer timers on. If not specified, the timeout scheduler is used.
     *  @return An observable sequence of buffers.
     */
    observableProto.bufferWithTime = function (timeSpan, timeShiftOrScheduler, scheduler) {
        var timeShift;
        if (timeShiftOrScheduler === undefined) {
            timeShift = timeSpan;
        }
        scheduler || (scheduler = timeoutScheduler);
        if (typeof timeShiftOrScheduler === 'number') {
            timeShift = timeShiftOrScheduler;
        } else if (typeof timeShiftOrScheduler === 'object') {
            timeShift = timeSpan;
            scheduler = timeShiftOrScheduler;
        }
        return this.windowWithTime(timeSpan, timeShift, scheduler).selectMany(function (x) {
            return x.toArray();
        });
    };

    /**
     *  Projects each element of an observable sequence into a buffer that is completed when either it's full or a given amount of time has elapsed.
     *  
     *  1 - res = source.bufferWithTimeOrCount(5000, 50); // 5s or 50 items in an array 
     *  2 - res = source.bufferWithTimeOrCount(5000, 50, scheduler); // 5s or 50 items in an array
     *  
     *  @param timeSpan Maximum time length of a buffer.
     *  @param count Maximum element count of a buffer.
     *  @param [scheduler]  Scheduler to run bufferin timers on. If not specified, the timeout scheduler is used.
     *  @return An observable sequence of buffers.
     */
    observableProto.bufferWithTimeOrCount = function (timeSpan, count, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        return this.windowWithTimeOrCount(timeSpan, count, scheduler).selectMany(function (x) {
            return x.toArray();
        });
    };

    /**
     *  Records the time interval between consecutive values in an observable sequence.
     *  
     *  1 - res = source.timeInterval();
     *  2 - res = source.timeInterval(Rx.Scheduler.timeout);
     *  
     *  @param [scheduler]  Scheduler used to compute time intervals. If not specified, the timeout scheduler is used.
     *  @return An observable sequence with time interval information on values.
     */
    observableProto.timeInterval = function (scheduler) {
        var source = this;
        scheduler || (scheduler = timeoutScheduler);
        return observableDefer(function () {
            var last = scheduler.now();
            return source.select(function (x) {
                var now = scheduler.now(), span = now - last;
                last = now;
                return {
                    value: x,
                    interval: span
                };
            });
        });
    };

    /**
     *  Records the timestamp for each value in an observable sequence.
     *  
     *  1 - res = source.timestamp(); // produces { value: x, timestamp: ts }
     *  2 - res = source.timestamp(Rx.Scheduler.timeout);
     *  
     *  @param [scheduler]  Scheduler used to compute timestamps. If not specified, the timeout scheduler is used.
     *  @return An observable sequence with timestamp information on values.
     */
    observableProto.timestamp = function (scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        return this.select(function (x) {
            return {
                value: x,
                timestamp: scheduler.now()
            };
        });
    };

    function sampleObservable(source, sampler) {
        
        return new AnonymousObservable(function (observer) {
            var atEnd, value, hasValue;

            function sampleSubscribe() {
                if (hasValue) {
                    hasValue = false;
                    observer.onNext(value);
                }
                if (atEnd) {
                    observer.onCompleted();
                }
            }

            return new CompositeDisposable(
                source.subscribe(function (newValue) {
                    hasValue = true;
                    value = newValue;
                }, observer.onError.bind(observer), function () {
                    atEnd = true;
                }),
                sampler.subscribe(sampleSubscribe, observer.onError.bind(observer), sampleSubscribe)
            )
        });
    };

    /**
     *  Samples the observable sequence at each interval.
     *  
     *  1 - res = source.sample(sampleObservable); // Sampler tick sequence
     *  2 - res = source.sample(5000); // 5 seconds
     *  2 - res = source.sample(5000, Rx.Scheduler.timeout); // 5 seconds
     *  
     *  @param source Source sequence to sample.
     *  @param interval Interval at which to sample (specified as an integer denoting milliseconds).
     *  @param [scheduler]  Scheduler to run the sampling timer on. If not specified, the timeout scheduler is used.
     *  @return Sampled observable sequence.
     */
    observableProto.sample = function (intervalOrSampler, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        if (typeof intervalOrSampler === 'number') {
            return sampleObservable(this, observableinterval(intervalOrSampler, scheduler));
        }
        return sampleObservable(this, intervalOrSampler);
    };

    /**
     *  Returns the source observable sequence or the other observable sequence if dueTime elapses.
     *  
     *  1 - res = source.timeout(new Date()); // As a date
     *  2 - res = source.timeout(5000); // 5 seconds
     *  3 - res = source.timeout(new Date(), Rx.Observable.returnValue(42)); // As a date and timeout observable
     *  4 - res = source.timeout(5000, Rx.Observable.returnValue(42)); // 5 seconds and timeout observable
     *  5 - res = source.timeout(new Date(), Rx.Observable.returnValue(42), Rx.Scheduler.timeout); // As a date and timeout observable
     *  6 - res = source.timeout(5000, Rx.Observable.returnValue(42), Rx.Scheduler.timeout); // 5 seconds and timeout observable
     *  
     *  @param dueTime Absolute (specified as a Date object) or relative time (specified as an integer denoting milliseconds) when a timeout occurs.
     *  @param [other]  Sequence to return in case of a timeout. If not specified, a timeout error throwing sequence will be used.
     *  @param [scheduler]  Scheduler to run the timeout timers on. If not specified, the timeout scheduler is used.
     *  @return The source sequence switching to the other sequence in case of a timeout.
     */
    observableProto.timeout = function (dueTime, other, scheduler) {
        var schedulerMethod, source = this;
        other || (other = observableThrow(new Error('Timeout')));
        scheduler || (scheduler = timeoutScheduler);
        if (dueTime instanceof Date) {
            schedulerMethod = function (dt, action) {
                scheduler.scheduleWithAbsolute(dt, action);
            };
        } else {
            schedulerMethod = function (dt, action) {
                scheduler.scheduleWithRelative(dt, action);
            };
        }
        return new AnonymousObservable(function (observer) {
            var createTimer,
                id = 0,
                original = new SingleAssignmentDisposable(),
                subscription = new SerialDisposable(),
                switched = false,
                timer = new SerialDisposable();
            subscription.disposable(original);
            createTimer = function () {
                var myId = id;
                timer.disposable(schedulerMethod(dueTime, function () {
                    switched = id === myId;
                    var timerWins = switched;
                    if (timerWins) {
                        subscription.disposable(other.subscribe(observer));
                    }
                }));
            };
            createTimer();
            original.disposable(source.subscribe(function (x) {
                var onNextWins = !switched;
                if (onNextWins) {
                    id++;
                    observer.onNext(x);
                    createTimer();
                }
            }, function (e) {
                var onErrorWins = !switched;
                if (onErrorWins) {
                    id++;
                    observer.onError(e);
                }
            }, function () {
                var onCompletedWins = !switched;
                if (onCompletedWins) {
                    id++;
                    observer.onCompleted();
                }
            }));
            return new CompositeDisposable(subscription, timer);
        });
    };

    /**
     *  Generates an observable sequence by iterating a state from an initial state until the condition fails.
     *  
     *  res = source.generateWithAbsoluteTime(0, 
     *      function (x) { return return true; }, 
     *      function (x) { return x + 1; }, 
     *      function (x) { return x; }, 
     *      function (x) { return new Date(); 
     *  });
     *  
     *  @param initialState Initial state.
     *  @param condition Condition to terminate generation (upon returning false).
     *  @param iterate Iteration step function.
     *  @param resultSelector Selector function for results produced in the sequence.
     *  @param timeSelector Time selector function to control the speed of values being produced each iteration, returning Date values.
     *  @param [scheduler]  Scheduler on which to run the generator loop. If not specified, the timeout scheduler is used.
     *  @return The generated sequence.
     */
    Observable.generateWithAbsoluteTime = function (initialState, condition, iterate, resultSelector, timeSelector, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        return new AnonymousObservable(function (observer) {
            var first = true,
                hasResult = false,
                result,
                state = initialState,
                time;
            return scheduler.scheduleRecursiveWithAbsolute(scheduler.now(), function (self) {
                if (hasResult) {
                    observer.onNext(result);
                }
                try {
                    if (first) {
                        first = false;
                    } else {
                        state = iterate(state);
                    }
                    hasResult = condition(state);
                    if (hasResult) {
                        result = resultSelector(state);
                        time = timeSelector(state);
                    }
                } catch (e) {
                    observer.onError(e);
                    return;
                }
                if (hasResult) {
                    self(time);
                } else {
                    observer.onCompleted();
                }
            });
        });
    };

    /**
     *  Generates an observable sequence by iterating a state from an initial state until the condition fails.
     *  
      *  res = source.generateWithRelativeTime(0, 
     *      function (x) { return return true; }, 
     *      function (x) { return x + 1; }, 
     *      function (x) { return x; }, 
     *      function (x) { return 500; }
     *  );
     *  
     *  @param initialState Initial state.
     *  @param condition Condition to terminate generation (upon returning false).
     *  @param iterate Iteration step function.
     *  @param resultSelector Selector function for results produced in the sequence.
     *  @param timeSelector Time selector function to control the speed of values being produced each iteration, returning integer values denoting milliseconds.
     *  @param [scheduler]  Scheduler on which to run the generator loop. If not specified, the timeout scheduler is used.
     *  @return The generated sequence.
     */
    Observable.generateWithRelativeTime = function (initialState, condition, iterate, resultSelector, timeSelector, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        return new AnonymousObservable(function (observer) {
            var first = true,
                hasResult = false,
                result,
                state = initialState,
                time;
            return scheduler.scheduleRecursiveWithRelative(0, function (self) {
                if (hasResult) {
                    observer.onNext(result);
                }
                try {
                    if (first) {
                        first = false;
                    } else {
                        state = iterate(state);
                    }
                    hasResult = condition(state);
                    if (hasResult) {
                        result = resultSelector(state);
                        time = timeSelector(state);
                    }
                } catch (e) {
                    observer.onError(e);
                    return;
                }
                if (hasResult) {
                    self(time);
                } else {
                    observer.onCompleted();
                }
            });
        });
    };

    /**
     *  Time shifts the observable sequence by delaying the subscription.
     *  
     *  1 - res = source.delaySubscription(5000); // 5s
     *  2 - res = source.delaySubscription(5000, Rx.Scheduler.timeout); // 5 seconds
     *  
     *  @param dueTime Absolute or relative time to perform the subscription at.
     *  @param [scheduler]  Scheduler to run the subscription delay timer on. If not specified, the timeout scheduler is used.
     *  @return Time-shifted sequence.
     */
    observableProto.delaySubscription = function (dueTime, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        return this.delayWithSelector(observableTimer(dueTime, scheduler), function () { return observableEmpty(); });
    };

    /**
     *  Time shifts the observable sequence based on a subscription delay and a delay selector function for each element.
     *  
     *  1 - res = source.delayWithSelector(function (x) { return Rx.Scheduler.timer(5000); }); // with selector only
     *  1 - res = source.delayWithSelector(Rx.Observable.timer(2000), function (x) { return Rx.Observable.timer(x); }); // with delay and selector
     *  
     *  @param [subscriptionDelay]  Sequence indicating the delay for the subscription to the source. 
     *  @param delayDurationSelector Selector function to retrieve a sequence indicating the delay for each given element.
     *  @return Time-shifted sequence.
     */
    observableProto.delayWithSelector = function (subscriptionDelay, delayDurationSelector) {
        var source = this, subDelay, selector;
        if (typeof subscriptionDelay === 'function') {
            selector = subscriptionDelay;
        } else {
            subDelay = subscriptionDelay;
            selector = delayDurationSelector;
        }
        return new AnonymousObservable(function (observer) {
            var delays = new CompositeDisposable(), atEnd = false, done = function () {
                if (atEnd && delays.length === 0) {
                    observer.onCompleted();
                }
            }, subscription = new SerialDisposable(), start = function () {
                subscription.setDisposable(source.subscribe(function (x) {
                    var delay;
                    try {
                        delay = selector(x);
                    } catch (error) {
                        observer.onError(error);
                        return;
                    }
                    var d = new SingleAssignmentDisposable();
                    delays.add(d);
                    d.setDisposable(delay.subscribe(function () {
                        observer.onNext(x);
                        delays.remove(d);
                        done();
                    }, observer.onError.bind(observer), function () {
                        observer.onNext(x);
                        delays.remove(d);
                        done();
                    }));
                }, observer.onError.bind(observer), function () {
                    atEnd = true;
                    subscription.dispose();
                    done();
                }));
            };

            if (!subDelay) {
                start();
            } else {
                subscription.setDisposable(subDelay.subscribe(function () {
                    start();
                }, observer.onError.bind(onError), function () { start(); }));
            }

            return new CompositeDisposable(subscription, delays);
        });
    };

    /**
     *  Returns the source observable sequence, switching to the other observable sequence if a timeout is signaled.
     *  
     *  1 - res = source.timeoutWithSelector(Rx.Observable.timer(500)); 
     *  2 - res = source.timeoutWithSelector(Rx.Observable.timer(500), function (x) { return Rx.Observable.timer(200); });
     *  3 - res = source.timeoutWithSelector(Rx.Observable.timer(500), function (x) { return Rx.Observable.timer(200); }, Rx.Observable.returnValue(42));
     *  
     *  @param [firstTimeout]  Observable sequence that represents the timeout for the first element. If not provided, this defaults to Observable.never().
     *  @param [timeoutDurationSelector] Selector to retrieve an observable sequence that represents the timeout between the current element and the next element.
     *  @param [other]  Sequence to return in case of a timeout. If not provided, this is set to Observable.throwException(). 
     *  @return The source sequence switching to the other sequence in case of a timeout.
     */
    observableProto.timeoutWithSelector = function (firstTimeout, timeoutdurationSelector, other) {
        firstTimeout || (firstTimeout = observableNever());
        other || (other = observableThrow(new Error('Timeout')));
        var source = this;
        return new AnonymousObservable(function (observer) {
            var subscription = new SerialDisposable(), timer = new SerialDisposable(), original = new SingleAssignmentDisposable();

            subscription.setDisposable(original);

            var id = 0, switched = false, setTimer = function (timeout) {
                var myId = id, timerWins = function () {
                    return id === myId;
                };
                var d = new SingleAssignmentDisposable();
                timer.setDisposable(d);
                d.setDisposable(timeout.subscribe(function () {
                    if (timerWins()) {
                        subscription.setDisposable(other.subscribe(observer));
                    }
                    d.dispose();
                }, function (e) {
                    if (timerWins()) {
                        observer.onError(e);
                    }
                }, function () {
                    if (timerWins()) {
                        subscription.setDisposable(other.subscribe(observer));
                    }
                }));
            };

            setTimer(firstTimeout);
            var observerWins = function () {
                var res = !switched;
                if (res) {
                    id++;
                }
                return res;
            };

            original.setDisposable(source.subscribe(function (x) {
                if (observerWins()) {
                    observer.onNext(x);
                    var timeout;
                    try {
                        timeout = timeoutdurationSelector(x);
                    } catch (e) {
                        observer.onError(e);
                        return;
                    }
                    setTimer(timeout);
                }
            }, function (e) {
                if (observerWins()) {
                    observer.onError(e);
                }
            }, function () {
                if (observerWins()) {
                    observer.onCompleted();
                }
            }));
            return new CompositeDisposable(subscription, timer);
        });
    };

    /**
     *  Ignores values from an observable sequence which are followed by another value within a computed throttle duration.
     *  
     *  1 - res = source.delayWithSelector(function (x) { return Rx.Scheduler.timer(x + x); }); 
     *  
     *  @param throttleDurationSelector Selector function to retrieve a sequence indicating the throttle duration for each given element.
     *  @return The throttled sequence.
     */
    observableProto.throttleWithSelector = function (throttleDurationSelector) {
        var source = this;
        return new AnonymousObservable(function (observer) {
            var value, hasValue = false, cancelable = new SerialDisposable(), id = 0, subscription = source.subscribe(function (x) {
                var throttle;
                try {
                    throttle = throttleDurationSelector(x);
                } catch (e) {
                    observer.onError(e);
                    return;
                }
                hasValue = true;
                value = x;
                id++;
                var currentid = id, d = new SingleAssignmentDisposable();
                cancelable.setDisposable(d);
                d.setDisposable(throttle.subscribe(function () {
                    if (hasValue && id === currentid) {
                        observer.onNext(value);
                    }
                    hasValue = false;
                    d.dispose();
                }, observer.onError.bind(observer), function () {
                    if (hasValue && id === currentid) {
                        observer.onNext(value);
                    }
                    hasValue = false;
                    d.dispose();
                }));
            }, function (e) {
                cancelable.dispose();
                observer.onError(e);
                hasValue = false;
                id++;
            }, function () {
                cancelable.dispose();
                if (hasValue) {
                    observer.onNext(value);
                }
                observer.onCompleted();
                hasValue = false;
                id++;
            });
            return new CompositeDisposable(subscription, cancelable);
        });
    };

    /**
     *  Skips elements for the specified duration from the end of the observable source sequence, using the specified scheduler to run timers.
     *  
     *  1 - res = source.skipLastWithTime(5000);     
     *  2 - res = source.skipLastWithTime(5000, scheduler); 
     *  
     *  @param duration Duration for skipping elements from the end of the sequence.
     *  @param [scheduler]  Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout
     *  @return An observable sequence with the elements skipped during the specified duration from the end of the source sequence.
     *  
     *  This operator accumulates a queue with a length enough to store elements received during the initial duration window.
     *  As more elements are received, elements older than the specified duration are taken from the queue and produced on the
     *  result sequence. This causes elements to be delayed with duration.
     *  
     */
    observableProto.skipLastWithTime = function (duration, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        var source = this;
        return new AnonymousObservable(function (observer) {
            var q = [];
            return source.subscribe(function (x) {
                var now = scheduler.now();
                q.push({ interval: now, value: x });
                while (q.length > 0 && now - q[0].interval >= duration) {
                    observer.onNext(q.shift().value);
                }
            }, observer.onError.bind(observer), function () {
                var now = scheduler.now();
                while (q.length > 0 && now - q[0].interval >= duration) {
                    observer.onNext(q.shift().value);
                }
                observer.onCompleted();
            });
        });
    };

    /**
     *  Returns elements within the specified duration from the end of the observable source sequence, using the specified schedulers to run timers and to drain the collected elements.
     *  
     *  1 - res = source.takeLastWithTime(5000, [optional timer scheduler], [optional loop scheduler]); 
     *  
     *  @param duration Duration for taking elements from the end of the sequence.
     *  @param [timerScheduler]  Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
     *  @param [loopScheduler]  Scheduler to drain the collected elements. If not specified, defaults to Rx.Scheduler.immediate.
     *  @return An observable sequence with the elements taken during the specified duration from the end of the source sequence.
     *  
     *  This operator accumulates a buffer with a length enough to store elements for any duration window during the lifetime of
     *  the source sequence. Upon completion of the source sequence, this buffer is drained on the result sequence. This causes the result elements
     *  to be delayed with duration.
     *  
     */
    observableProto.takeLastWithTime = function (duration, timerScheduler, loopScheduler) {
        return this.takeLastBufferWithTime(duration, timerScheduler).selectMany(function (xs) { return observableFromArray(xs, loopScheduler); });
    };

    /**
     *  Returns an array with the elements within the specified duration from the end of the observable source sequence, using the specified scheduler to run timers.
     *  
     *  1 - res = source.takeLastBufferWithTime(5000, [optional scheduler]); 
     *  
     *  @param duration Duration for taking elements from the end of the sequence.
     *  @param scheduler Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
     *  @return An observable sequence containing a single array with the elements taken during the specified duration from the end of the source sequence.
     *  
     *  This operator accumulates a buffer with a length enough to store elements for any duration window during the lifetime of
     *  the source sequence. Upon completion of the source sequence, this buffer is produced on the result sequence.
     *  
     */
    observableProto.takeLastBufferWithTime = function (duration, scheduler) {
        var source = this;
        scheduler || (scheduler = timeoutScheduler);
        return new AnonymousObservable(function (observer) {
            var q = [];

            return source.subscribe(function (x) {
                var now = scheduler.now();
                q.push({ interval: now, value: x });
                while (q.length > 0 && now - q[0].interval >= duration) {
                    q.shift();
                }
            }, observer.onError.bind(observer), function () {
                var now = scheduler.now(), res = [];
                while (q.length > 0) {
                    var next = q.shift();
                    if (now - next.interval <= duration) {
                        res.push(next.value);
                    }
                }

                observer.onNext(res);
                observer.onCompleted();
            });
        });
    };

    /**
     *  Takes elements for the specified duration from the start of the observable source sequence, using the specified scheduler to run timers.
     *  
     *  1 - res = source.takeWithTime(5000,  [optional scheduler]); 
     *  
     *  @param duration Duration for taking elements from the start of the sequence.
     *  @param scheduler Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
     *  @return An observable sequence with the elements taken during the specified duration from the start of the source sequence.
     *  
     *  Specifying a zero value for duration doesn't guarantee an empty sequence will be returned. This is a side-effect
     *  of the asynchrony introduced by the scheduler, where the action that stops forwarding callbacks from the source sequence may not execute
     *  immediately, despite the zero due time.
     *  
     */
    observableProto.takeWithTime = function (duration, scheduler) {
        var source = this;
        scheduler || (scheduler = timeoutScheduler);
        return new AnonymousObservable(function (observer) {
            var t = scheduler.scheduleWithRelative(duration, function () {
                observer.onCompleted();
            });

            return new CompositeDisposable(t, source.subscribe(observer));
        });
    };

    /**
     *  Skips elements for the specified duration from the start of the observable source sequence, using the specified scheduler to run timers.
     *  
     *  1 - res = source.skipWithTime(5000, [optional scheduler]); 
     *  
     *  @param duration Duration for skipping elements from the start of the sequence.
     *  @param scheduler Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
     *  @return An observable sequence with the elements skipped during the specified duration from the start of the source sequence.
     *  
     *  Specifying a zero value for duration doesn't guarantee no elements will be dropped from the start of the source sequence.
     *  This is a side-effect of the asynchrony introduced by the scheduler, where the action that causes callbacks from the source sequence to be forwarded
     *  may not execute immediately, despite the zero due time.
     *  
     *  Errors produced by the source sequence are always forwarded to the result sequence, even if the error occurs before the duration.
     *  
     */
    observableProto.skipWithTime = function (duration, scheduler) {
        var source = this;
        scheduler || (scheduler = timeoutScheduler);
        return new AnonymousObservable(function (observer) {
            var open = false,
                t = scheduler.scheduleWithRelative(duration, function () { open = true; }),
                d = source.subscribe(function (x) {
                    if (open) {
                        observer.onNext(x);
                    }
                }, observer.onError.bind(observer), observer.onCompleted.bind(observer));

            return new CompositeDisposable(t, d);
        });
    };

    /**
     *  Skips elements from the observable source sequence until the specified start time, using the specified scheduler to run timers.
     *  
     *  1 - res = source.skipUntilWithTime(new Date(), [optional scheduler]);         
     *  
     *  @param startTime Time to start taking elements from the source sequence. If this value is less than or equal to Date(), no elements will be skipped.
     *  @param scheduler Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
     *  @return An observable sequence with the elements skipped until the specified start time.
     *  
     *  Errors produced by the source sequence are always forwarded to the result sequence, even if the error occurs before the <paramref name="startTime"/>.
     *  
     */
    observableProto.skipUntilWithTime = function (startTime, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        var source = this;
        return new AnonymousObservable(function (observer) {
            var open = false,
                t = scheduler.scheduleWithAbsolute(startTime, function () { open = true; }),
                d = source.subscribe(function (x) {
                    if (open) {
                        observer.onNext(x);
                    }
                }, observer.onError.bind(observer), observer.onCompleted.bind(observer));

            return new CompositeDisposable(t, d);
        });
    };

    /**
     *  Takes elements for the specified duration until the specified end time, using the specified scheduler to run timers.
     *  
     *  1 - res = source.takeUntilWithTime(new Date(), [optional scheduler]);   
     *  
     *  @param endTime Time to stop taking elements from the source sequence. If this value is less than or equal to new Date(), the result stream will complete immediately.
     *  @param scheduler Scheduler to run the timer on.
     *  @return An observable sequence with the elements taken until the specified end time.
     */
    observableProto.takeUntilWithTime = function (endTime, scheduler) {
        scheduler || (scheduler = timeoutScheduler);
        var source = this;
        return new AnonymousObservable(function (observer) {
            return new CompositeDisposable(scheduler.scheduleWithAbsolute(endTime, function () {
                observer.onCompleted();
            }),  source.subscribe(observer));
        });
    };

    return root;
}));
//
// Module: ../ext/rx.html
//

define.names.push("../ext/rx.html");
/**
* Copyright 2013 Microsoft Corporation
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

(function (root, factory) {
    var freeExports = typeof exports == 'object' && exports &&
    (typeof root == 'object' && root && root == root.global && (window = root), exports);

    // Because of build optimizers
    if (typeof define === 'function' && define.amd) {
        define(['./rx', 'exports'], function (Rx, exports) {
            root.Rx = factory(root, exports, Rx);
            return root.Rx;
        });
    }  else if (typeof module == 'object' && module && module.exports == freeExports) {
        var rxroot = factory(root, module.exports, require('./rx'));
        module.exports = rxroot.Rx;
    } else {
        root.Rx = factory(root, {}, root.Rx);
    }
}(this, function (global, undefined) {
    var freeExports = typeof exports == 'object' && exports &&
    (typeof global == 'object' && global && global == global.global && (window = global), exports);

    var root = global.Rx,
        Observable = root.Observable,
        observableProto = Observable.prototype,
        observableCreateWithDisposable = Observable.createWithDisposable,
        disposableCreate = root.Disposable.create,
        CompositeDisposable = root.CompositeDisposable,
        RefCountDisposable = root.RefCountDisposable,
        AsyncSubject = root.AsyncSubject;

    // FireFox does not support focusin and focusout events atm.
    // We use focus and blur with capture so that FF is happy. But
    // then we got some issues with IE8. We fix the IE issues below.
    // Contact: knjohans@microsoft.com for more information.
    var specialEventsMap = { focus: "focusin", blur: "focusout" };
    function adjustName(name, useCapture) {
        return (useCapture && specialEventsMap[name]) || name;
    }

    function createListener(element, name, handler, useCapture) {
        if (element.addEventListener) {
            element.addEventListener(name, handler, useCapture);
            return disposableCreate(function () {
                element.removeEventListener(name, handler, useCapture);
            });
        } else if (element.attachEvent) {
            var adjustedName = adjustName(name, useCapture);
            element.attachEvent('on' + adjustedName, handler);
            return disposableCreate(function () {
                element.detachEvent('on' + adjustedName, handler);
            });         
        } else {
            var adjustedName = adjustName(name, useCapture);
            element['on' + adjustedName] = handler;
            return disposableCreate(function () {
                element['on' + adjustedName] = null;
            });
        }
    }

    function createEventListener (el, eventName, handler, useCapture) {
        var disposables = new CompositeDisposable();

        if ( el && el.nodeName || el === global ) {
            disposables.add(createListener(el, eventName, handler, useCapture));
        } else if ( el && el.length ) {
            for (var i = 0, len = el.length; i < len; i++) {
                disposables.add(createEventListener(
                    el[i],
                    eventName,
                    handler,
                    useCapture
                ));
            }
        }

        return disposables;
    }

    Observable.fromEvent = function (element, eventName, useCapture) {
        return observableCreateWithDisposable(function (observer) {
            function handler (e) { observer.onNext(e); }
            return createEventListener(
                element,
                eventName,
                handler,
                typeof useCapture === "boolean" || false
            );
        }).select(function (event) {
            event.target = event.target || event.srcElement;
            event.preventDefault = event.preventDefault || function () {
                this.returnValue = false;
            };
            return event;
        });
    };

    var destroy = (function () {
        var trash = document.createElement('div');
        return function (element) {
            trash.appendChild(element);
            trash.innerHTML = '';
        };
    })();

    
    Observable.getJSONPRequest = (function () {
        var uniqueId = 0;
        return function (url) {
            var subject = new AsyncSubject(),
            head = document.getElementsByTagName('head')[0] || document.documentElement,
            tag = document.createElement('script'),
            handler = 'rxjscallback' + uniqueId++,
            url = url.replace('=JSONPCallback', '=' + handler);

            global[handler] = function (data) {
                subject.onNext(data);
                subject.onCompleted();  
            };

            tag.src = url;
            tag.async = true;
            tag.onload = tag.onreadystatechange = function (_, abort) {
                if ( abort || !tag.readyState || /loaded|complete/.test(tag.readyState) ) {
                    tag.onload = tag.onreadystatechange = null;
                    if (head && tag.parentNode) {
                        destroy(tag);
                    }
                    tag = undefined;
                    delete global[handler];
                }
                
            };  
            head.insertBefore(tag, head.firstChild);
            var refCount = new RefCountDisposable(disposableCreate( function () {
                if (!/loaded|complete/.test(tag.readyState)) {
                    tag.abort();
                    tag.onload = tag.onreadystatechange = null;
                    if (head && tag.parentNode) {
                        destroy(tag);
                    }
                    tag = undefined;
                    delete global[handler];
                    subject.onError(new Error('The script has been aborted'));
                }
            }));

            return observableCreateWithDisposable( function (subscriber) {
                return new CompositeDisposable(subject.subscribe(subscriber), refCount.getDisposable());
            });
        };      

    })();

    function getXMLHttpRequest() {
        if (global.XMLHttpRequest) {
            return new global.XMLHttpRequest;
        } else {
            try {
                return new global.ActiveXObject('Microsoft.XMLHTTP');
            } catch (e) {
                throw new Error('XMLHttpRequest is not supported by your browser');
            }
        }
    }
    
    var observableAjax = Observable.ajax = function (settings) {
        if (typeof settings === 'string') {
            settings = { method: 'GET', url: settings, async: true };
        }
        if (typeof settings.async === "undefined") {
            settings.async = true;
        }
        var subject = new AsyncSubject(),
        xhr = getXMLHttpRequest();

        try {
            if (settings.user) {
                xhr.open(settings.method, settings.url, settings.async, settings.user, settings.password);
            } else {
                xhr.open(settings.method, settings.url, settings.async);
            }

            if (settings.headers) {
                var headers = settings.headers;
                for (var header in headers) {
                    xhr.setRequestHeader(header, headers[header]);
                }
            }

            xhr.onreadystatechange = xhr.onload = function () {
                if (xhr.readyState === 4) {
                    subject.onNext(xhr);
                    subject.onCompleted();
                }
            };

            xhr.onerror = xhr.onabort = function () {
                subject.onError(xhr);
            };

            xhr.send(settings.body || null);
        } catch (e) {
            subject.onError(e);
        }
        
        var refCount = new RefCountDisposable(disposableCreate( function () {
            if (xhr.readyState !== 4) {
                xhr.abort();
                subject.onError(xhr);
            }
        }));

        return observableCreateWithDisposable( function (subscriber) {
            return new CompositeDisposable(subject.subscribe(subscriber), refCount.getDisposable(), refCount);
        });
    };
    
    Observable.post = function (url, body) {
        return observableAjax({ url: url, body: body, method: 'POST', async: true });
    };
    
    var observableGet = Observable.get = function (url) {
        return observableAjax({ url: url, method: 'GET', async: true });
    };
    
    if (JSON && JSON.parse) {
        Observable.getJSON = function (url) {
            return observableGet(url).select(function (xhr) {
                return JSON.parse(xhr.responseText);
            });
        };      
    }

    return root;

}));
//
// Module: utils
//

define.names.push("utils");
/// <reference path="strings.d.ts" />
define(["require", "exports", "../ext/msfuncy-0.9", "../ext/rx", "../ext/rx.html"], function(require, exports, _, rx, rxh) {
    

    

    

    // Instantiating regex only once for performance reasons.
    var trimPattern = /^\s*|\s*$/g;

    /**
    * Trims the specified string.}
    *
    * @param str The string to trim.
    */
    function trim(str) {
        if (typeof str !== "string") {
            throw new Error("Parameter str must be specified.");
        }
        return str.trim ? str.trim() : str.replace(trimPattern, "");
    }
    exports.trim = trim;

    /**
    * Extracts the server url from a longer url.
    *
    * @param fullUrl The complete url to extract the server url from.
    */
    function getServerUrl(fullUrl) {
        if (fullUrl) {
            var match = fullUrl.match(/^https?:\/\/[^\/]*/)[0];
            if (match) {
                return match.substr(0, match.length);
            }
        }
        return null;
    }
    exports.getServerUrl = getServerUrl;

    /**
    * Removes the right-most part of an URL. Typically, the file name.
    *
    * @param url The url to chop.
    * @return The chopped url.
    */
    function chopUrl(url) {
        return url.substring(0, url.lastIndexOf('/'));
    }
    exports.chopUrl = chopUrl;

    /**
    * Returns the result of the new Date().ValueOf() function.
    */
    function now() {
        return new Date().valueOf();
    }
    exports.now = now;

    /**
    * stringifies the data and saves it to sessionStorage with the key as id
    *
    * @param key The id of the item in sessionStorage
    * @param data The data to save in sessionStorage
    */
    function saveToSessionStorage(key, data) {
        try  {
            sessionStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
        }
    }
    exports.saveToSessionStorage = saveToSessionStorage;

    /**
    * load data from sessionStorage with the given key.
    *
    * @param key The id of the item to load
    *
    * @return JSON parsed data or null if the item isn't stored in sessionStorage
    */
    function loadFromSessionStorage(key) {
        try  {
            var data = sessionStorage.getItem(key);
            return JSON.parse(data);
        } catch (e) {
        }
    }
    exports.loadFromSessionStorage = loadFromSessionStorage;

    /**
    * The document object.
    */
    exports.doc = document;

    /**
    * Escapes a string, modifying characters used in regexp:
    *
    * @param str The string to escape.
    *
    * @return The regexp escaped string.
    */
    function escapeRegExp(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\//oilcode//");
    }
    exports.escapeRegExp = escapeRegExp;

    /**
    * Does an extensive trim on the specified text. Extensive means
    * that any consecutive white space is removed.
    *
    * @param text The text to extensively trim.
    *
    * @return The trimmed text.
    */
    function etrim(text) {
        if (typeof text !== "string") {
            throw new Error("Parameter text must be of type String.");
        }
        return text.replace(/^\s+|\s+$|\s+(?=\s)/g, "");
    }
    exports.etrim = etrim;

    /**
    * Makes an effort to strip away anything that could lead to an XSS attack in a URL component.
    * As part of the effort the URL is URL-component-encoded.
    *
    * Function is based on attack vectors found @ https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet
    *
    * @param text The URL component to strip.
    *
    * @return The stripped and encoded URL component.
    */
    function makeSafeUrlComponent(urlComponent) {
        return makeSafeUrlInternal(urlComponent, encodeURIComponent);
    }
    exports.makeSafeUrlComponent = makeSafeUrlComponent;

    /**
    * Makes an effort to strip away anything that could lead to an XSS attack in a URL.
    * As part of the effort the URL is URL-encoded.
    *
    * Function is based on attack vectors found @ https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet
    *
    * @param text The URL to strip.
    *
    * @return The stripped and encoded URL.
    */
    function makeSafeUrl(url) {
        return makeSafeUrlInternal(url, encodeURI);
    }
    exports.makeSafeUrl = makeSafeUrl;

    function makeSafeUrlInternal(url, encoder) {
        if (!url || typeof url !== "string") {
            return "";
        }

        return encoder(url).replace(/'/g, '%27').replace(/&#(0*(74|106)|x0*(4A|6A))[;]?/gi, 'j').replace(/&#(0*(65|97)|x0*(41|61))[;]?/gi, 'a').replace(/&#(0*(86|118)|x0*(56|76))[;]?/gi, 'v').replace(/&#(0*(83|115)|x0*(53|73))[;]?/gi, 's').replace(/&#(0*(67|99)|x0*(43|63))[;]?/gi, 'c').replace(/&#(0*(82|114)|x0*(52|72))[;]?/gi, 'r').replace(/&#(0*(73|105)|x0*(49|69))[;]?/gi, 'i').replace(/&#(0*(80|112)|x0*(50|70))[;]?/gi, 'p').replace(/&#(0*(84|116)|x0*(54|74))[;]?/gi, 't').replace(/&#(0*(66|98)|x0*(42|62))[;]?/gi, 'b').replace(/&#(0*58|x0*3A)[;]?/gi, ':').replace(/&#x?0*9[;]?/gi, '').replace(/&#(0*10|x0*A)[;]?/gi, '').replace(/&#(0*13|x0*D)[;]?/gi, '').replace(/javascript:/gi, '').replace(/vbscript:/gi, '');
    }

    /**
    * HTML-encodes a string.
    *
    * @param text The data to HTML-encode.
    *
    * @return The HTML-encoded data.
    */
    function htmlEncode(html) {
        if (!html || typeof html !== "string") {
            return "";
        }

        return html.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    exports.htmlEncode = htmlEncode;

    var _s_hexcode = [
        '0', '1', '2', '3', '4', '5', '6', '7',
        '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'
    ];

    function newGuid() {
        for (var a = "", c = 0; c < 32; c++) {
            var b = Math.floor(Math.random() * 16);
            switch (c) {
                case 8:
                    a += "-";
                    break;
                case 12:
                    b = 4;
                    a += "-";
                    break;
                case 16:
                    b = b & 3 | 8;
                    a += "-";
                    break;
                case 20:
                    a += "-";
            }
            a += _s_hexcode[b];
        }
        return a;
    }
    exports.newGuid = newGuid;

    function getFragmentParams() {
        var fragmentParams = {};
        var e, r = /([^&;=]+)=?([^&;]*)/g, q = window.location.hash.substring(1);

        while (e = r.exec(q)) {
            fragmentParams[decodeURIComponent(e[1])] = decodeURIComponent(e[2]);
        }

        return fragmentParams;
    }
    exports.getFragmentParams = getFragmentParams;

    function setFragmentParams(params) {
        var fragment;

        for (var key in params) {
            if (params.hasOwnProperty(key)) {
                fragment = (fragment) ? fragment + "&" : "";
                fragment += encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
            }
        }

        if (fragment) {
            window.location.hash = fragment;
        }
    }
    exports.setFragmentParams = setFragmentParams;

    /**
    * Turns the specified words into an object with properties
    * matching the specified words. All properties are initialized to
    * <c>true</c> if the state parameter is not specified. Note that
    * duplicate words are ignored.
    *
    * @param words The words to turn into flags.
    * @param state An optional state to set for the flags. Defaults to true.
    *
    * @returns An object with properties matching the specified words. All
    * properties are initialized to <c>true</c>.
    */
    function wordsToFlags(words, state) {
        if (typeof words !== "string") {
            throw new Error("Parameter words must be of type String.");
        }
        if (arguments.length === 2) {
            if (typeof state !== "boolean") {
                throw new Error("Parameter state must be of type Boolean.");
            }
        } else {
            state = true;
        }
        var trimmed = exports.etrim(words), flags = {};
        if (!trimmed) {
            return flags;
        }
        var wordList = trimmed.split(" "), numberOfWords = wordList.length, i = 0;
        for (; i < numberOfWords; i++) {
            flags[wordList[i]] = state;
        }
        return flags;
    }
    exports.wordsToFlags = wordsToFlags;

    /**
    * Turns the specified flags object into a space separated list of
    * words. Flags object must be an object with properties that have
    * boolean values. Properties that are <c>true</c> will be added
    * to words string.
    *
    * @param flags The flags object to turn into words.
    *
    * @returns A space separated list of words.
    */
    function flagsToWords(flags) {
        if (!flags || typeof flags !== "object") {
            throw new Error("Parameter flags must be an object instance.");
        }
        var words = [], flag;
        for (flag in flags) {
            flags[flag] && words.push(flag);
        }
        return words.join(" ");
    }
    exports.flagsToWords = flagsToWords;

    function getNavigatorUserLanguage() {
        return navigator.userLanguage;
    }
    exports.getNavigatorUserLanguage = getNavigatorUserLanguage;

    exports.serialize = JSON.stringify;
    exports.deserialize = JSON.parse;

    /**
    * Reduces a date string on a ISO8601 format to only have 3 millisec places.
    * IE9 is not able to parse the date if it has > 3 millisec digits.
    *
    * @param date The date string to be reduced
    *
    * @returns A date string on a ISO8601 format with max 3 millisec digits,
    * or the original date string if it doesn't match the ISO8601 pattern.
    */
    function reduceISO8601Millisecs(date) {
        var dateParts = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3})(\d*)([A-Za-z])?$/.exec(date);

        if (dateParts && dateParts.length === 4) {
            var shortendDate = dateParts[1];

            if (dateParts[3]) {
                return dateParts[1].concat(dateParts[3]);
            }

            return shortendDate;
        }

        return date;
    }
    exports.reduceISO8601Millisecs = reduceISO8601Millisecs;

    /**
    * Convert an array of character codes to string.
    *
    * @param cca An array containing charcodes.
    *
    * @returns the generated string
    */
    function charCodesToString(cca) {
        _.asrt(_.isArray, "Charcodes must be in an array", cca);
        var out = new Array(cca.length);
        for (var i = 0; i < cca.length; i++) {
            out[i] = String.fromCharCode(cca[i]);
        }
        return out.join('');
    }
    exports.charCodesToString = charCodesToString;

    /**
    * Creates a new observable sequence for a JSON Ajax request.
    *
    * @param requestUrl url of the request.
    * @param requestBody the POST body of the request.
    *
    * @returns An observable sequence containing a parsed JSON object.
    */
    rx.Observable.prototype.postJSON = function (settings) {
        var defaultSettings = {
            method: 'POST',
            headers: {
                'ACCEPT': 'application/json;odata=verbose',
                'Content-Type': 'application/json;odata=verbose'
            },
            async: true
        };

        function parseJSON(response) {
            return JSON.parse(response.responseText);
        }

        return this.select(function (overrideSettings) {
            var s = _.extend(defaultSettings, settings, overrideSettings);
            return rxh.Observable.ajax(s);
        }).selectMany(function (d) {
            return d;
        }).select(parseJSON);
    };

    rx.Observable.prototype.not = function () {
        return this.select(function (value) {
            return !value;
        });
    };
});

//
// Module: sputils
//

define.names.push("sputils");
/// <reference path="../ext/sp.datetimeutil.d.ts" />
/// <reference path="rxextensions.d.ts" />
/// <reference path="strings.d.ts" />
define(["require", "exports", "../ext/msfuncy-0.9", "../ext/rx.time", "msg", "map", "utils"], function(require, exports, _, rxt, msg, map, utils) {
    exports.summaryLength = 100;
    var win = window;
    exports.DateTime = win.SP && win.SP.DateTimeUtil || {};

    /**
    * Creates a JSON response processor.
    *
    * @param path The path of the JSON result to traverse.
    */
    function jsonResponseProcessor(path) {
        return _.explain("Processing JSON response", _.pipe(_.getter("responseText"), _.explain("Parsing JSON", JSON.parse), _.explain("Traversing path '" + path.join(".") + "'", _.bind(_.oquery, path))));
    }
    exports.jsonResponseProcessor = jsonResponseProcessor;

    /**
    * Creates a result items processor.
    *
    * @param maps A list of model to view model maps.
    */
    function resultItemsProcessor(maps) {
        return _.explain("Processing result items", _.bind(_.map, _.pipe(_.bind(_.oquery, "Cells.results".split(".")), exports.keyValuesToObject, function (model) {
            return _.aggregate(maps, _.lateBind(model), {});
        })));
    }
    exports.resultItemsProcessor = resultItemsProcessor;

    function mapResults(maps) {
        var primaryQueryResultPath = "d.query.PrimaryQueryResult".split("."), resulItemsPath = "RelevantResults.Table.Rows.results".split(".");

        return _.pipe(_.explain("Traversing path '" + primaryQueryResultPath.join(".") + "'", _.bind(_.oquery, primaryQueryResultPath)), function (pqr) {
            return !pqr ? [] : _.oquery(resulItemsPath, pqr);
        }, exports.resultItemsProcessor(maps));
    }
    exports.mapResults = mapResults;

    /**
    * Converts an array of key/value pairs to an object with properties.
    *
    * @param keyValues Array of objects, each with a 'Key' and 'Value' property.
    * @return An object with property names and values from 'Key' and 'Value', respectively.
    */
    function keyValuesToObject(keyValues) {
        var obj = {};
        for (var i = 0; i < keyValues.length; i++) {
            obj[keyValues[i].Key] = keyValues[i].Value;
        }
        return obj;
    }
    exports.keyValuesToObject = keyValuesToObject;

    exports.deserialize = JSON.parse;

    /**
    * Validates a search result received via REST GET or POST.
    *
    * @param result A search result object received via REST GET or POST.
    * @return True if the result is valid, otherwise false.
    */
    function validSearchResult(result) {
        var data = result && result.d;

        if (!data) {
            return false;
        } else if (data.postquery) {
            data = data.postquery;
        } else if (data.query) {
            data = data.query;
        } else {
            return false;
        }

        return data.PrimaryQueryResult && data.PrimaryQueryResult.RelevantResults && data.PrimaryQueryResult.RelevantResults.Table && data.PrimaryQueryResult.RelevantResults.Table.Rows && data.PrimaryQueryResult.RelevantResults.Table.Rows.results;
    }
    exports.validSearchResult = validSearchResult;

    /**
    * Get extension of file if one exists.
    *
    * @param ISearchItem Search item with or without file extension.
    * @return File extension lower cased, or an empty string.
    */
    function getSearchItemFileExtension(item) {
        var itemHasFileExtension = typeof item.FileExtension !== "undefined" && item.FileExtension !== null;

        var fileExtension = itemHasFileExtension ? item.FileExtension : "";

        return fileExtension.toLowerCase();
    }
    exports.getSearchItemFileExtension = getSearchItemFileExtension;

    /**
    * Retrieve the server relative URL for the current SP site.
    * E.g, http://server/site/subsite/page.aspx => site/subsite/
    *
    * @return the server relative URL for the current SP site,
    *          or the empty string if not in an SP context.
    */
    function getServerSiteRelativeUrl() {
        if (typeof _spPageContextInfo === 'undefined') {
            return '';
        }

        return _spPageContextInfo.siteServerRelativeUrl;
    }
    exports.getServerSiteRelativeUrl = getServerSiteRelativeUrl;

    /**
    * Prepend the server relative URL for the current SP site to
    * the supplied url.
    *
    * @param string The url to prepend.
    * @return The concatenated url. (prepend + base)
    */
    function prependServerSiteRelativeUrl(baseUrl) {
        return exports.getServerSiteRelativeUrl().replace(/\/$/, '') + baseUrl;
    }
    exports.prependServerSiteRelativeUrl = prependServerSiteRelativeUrl;

    /**
    * Returns the REST API url for doing POST search queries.
    *
    * @return The REST API url for doing POST search queries.
    */
    function getPostQueryUrl() {
        return exports.prependServerSiteRelativeUrl(exports.postQueryUrl);
    }
    exports.getPostQueryUrl = getPostQueryUrl;

    /**
    * Returns the url to POST to to get the SP context info.
    * In under here goes the form digest.
    *
    * @return The url to POST to to get the SP context info.
    */
    function getContextInfoUrl() {
        return exports.prependServerSiteRelativeUrl(exports.contextInfoUrl);
    }
    exports.getContextInfoUrl = getContextInfoUrl;

    function getSharedWithUserUrl(maxDoxCount) {
        return "/_api/search/query?querytext='*'&selectproperties='editorowsuser,authorowsuser,Filename,SPSiteURL,Title,ListItemID,ListID,contentclass, IsDocument, IsContainer,FileExtension,SecondaryFileExtension,OriginalPath,DefaultEncodingURL,ServerRedirectedURL,ServerRedirectedPreviewURL,LastModifiedTime,SharedWithUsersOWSUser,HitHighlightedSummary'&sortlist='LastModifiedTime:descending'&querytemplate='SharedWithUsersOWSUser:{User.PreferredName}'&SummaryLength=" + exports.summaryLength + "&RowLimit=" + maxDoxCount;
    }
    exports.getSharedWithUserUrl = getSharedWithUserUrl;
    exports.postQueryUrl = '/_api/search/postquery';
    exports.contextInfoUrl = '/_api/contextinfo';

    /**
    * Returns a JSON object stringified suitable for use as body in POST requests against the search REST API.
    *
    * @param queryText The query text
    * @param rowLimit The maximum number of search results.
    * @param sortOnRecency Whether or not the search results should be sorted by recency.
    * @param cultureCode includes the idcn code for the user search language settings in SP, if null does not add the culture parameter.
    * @return A stringified JSON object.
    */
    function getSearchPostBody(queryTemplate, queryText, rowLimit, sortOnRecency, cultureCode) {
        var requestBody = {
            'request': {
                '__metadata': { 'type': 'Microsoft.Office.Server.Search.REST.SearchRequest' },
                'Querytext': queryText,
                'QueryTemplate': queryTemplate,
                'SelectProperties': {
                    'results': ['editorowsuser', 'authorowsuser', 'Filename', 'SPSiteURL', 'Title', 'ParentLink', 'ListItemID', 'ListID', 'contentclass', 'IsDocument', 'IsContainer', 'FileExtension', 'SecondaryFileExtension', 'OriginalPath', 'DefaultEncodingURL', 'ServerRedirectedURL', 'Path', 'ServerRedirectedPreviewURL', 'LastModifiedTime', 'SharedWithUsersOWSUser', 'ContentTypeId', 'HitHighlightedSummary']
                },
                'SummaryLength': exports.summaryLength,
                'SortList': {
                    'results': [{
                            'Property': 'LastModifiedTime', 'Direction': '1'
                        }]
                },
                'ClientType': "QueryBoxSkyDrive",
                'RowLimit': rowLimit
            }
        };

        if (!sortOnRecency) {
            delete requestBody['request']['SortList'];
        }
        if (cultureCode) {
            requestBody['request']['Culture'] = cultureCode;
        }

        return JSON.stringify(requestBody);
    }
    exports.getSearchPostBody = getSearchPostBody;

    // Query filter explanation
    // ContentTypeId:0x010100* : documents and files
    // ContentTypeId:0x012000* : folders
    // -ContentClass=STS_List_* : Removes SharePoint lists.
    // -ContentClass=STS_Site : Removes root sites
    // -ContentClass=STS_Web : Removes sub sites
    // -ContentClass=STS_ListItem_544 : to remove some unwanted system folders
    // -ContentClass=STS_ListItem_550 : to remove unwanted files/folders - might not be necessary
    exports.searchQueryFilter = "(ContentTypeId:0x010100* OR ContentTypeId:0x012000*) -ContentClass=STS_List_* -ContentClass=STS_Site -ContentClass=STS_Web -ContentClass=STS_ListItem_544 -ContentClass=STS_ListItem_550";

    /**
    * Validate, parse, and return search results from a REST query.
    *
    * @param result A search result structure as returned by REST.
    * @result Search results.
    */
    function parseSearchResult(result) {
        if (!exports.validSearchResult(result)) {
            return [];
            //throw new Error("Invalid response data.");
        }

        var data = result.d;
        if (data.postquery) {
            data = data.postquery;
        } else if (data.query) {
            data = data.query;
        }

        return data.PrimaryQueryResult.RelevantResults.Table.Rows.results;
    }
    exports.parseSearchResult = parseSearchResult;

    /**
    * Find the correct searchLanguage setting. If no setting in sharepoint
    * browser language will be used as the searchLanguage.
    *
    * @param searchLanguage The property from myproperties containing the searchLanguage.
    * @return Fist language if many are set and browser language if none are set.
    */
    function getMySearchLanguage(searchLanguages) {
        if (searchLanguages && searchLanguages.toLowerCase() !== "ui-ui") {
            if (searchLanguages.indexOf(',') !== -1) {
                return searchLanguages.split(',')[0];
            }
            return searchLanguages;
        }
        return navigator.language || utils.getNavigatorUserLanguage();
    }
    exports.getMySearchLanguage = getMySearchLanguage;

    /**
    * Fetches a query property given its name.
    * Note: The format of the query properties should match that returned by the REST search API.
    *
    * @param queryProperties Array of query properties as returned by the REST search API.
    * @param propertyName Name of the query property to get.
    * @return a query property value.
    */
    function getQueryPropertyValue(queryProperties, propertyName) {
        for (var i = 0; i < queryProperties.length; i++) {
            if (queryProperties[i].Key === propertyName) {
                return queryProperties[i].Value;
            }
        }

        return '';
    }
    exports.getQueryPropertyValue = getQueryPropertyValue;

    /**
    * Generates friendly/relative date based on a date object.
    * Frienly date examples: "About a minute ago" , "Monday at 3:40 PM"
    *
    * @param date The Date to generate the friendly date
    * @return A string representing the friendly date
    */
    function getFriendlyDateTime(date) {
        var includeTime = true, adjustToServersNowTime = false;
        return isNaN(date.getTime()) ? "" : exports.DateTime.SPRelativeDateTime.getRelativeDateTimeString(date, includeTime, exports.DateTime.SPCalendarType.none, adjustToServersNowTime);
    }
    exports.getFriendlyDateTime = getFriendlyDateTime;

    /**
    * Retrieve the server absolute URL for the current SP site.
    * E.g, http://server/site/subsite/page.aspx => http://server/site/subsite/
    *
    * @return the server absolute URL for the current SP site,
    *          or the empty string if not in an SP context.
    */
    function getServerSiteAbsoluteUrl() {
        if (typeof _spPageContextInfo === 'undefined') {
            return '';
        }

        return _spPageContextInfo.siteAbsoluteUrl;
    }
    exports.getServerSiteAbsoluteUrl = getServerSiteAbsoluteUrl;

    /**
    * Returns a descriptive localized text matching the file extension
    *
    * @param fileExtension The file extension to get the description for
    * @return String descibing the file extension
    */
    function getFileDescription(fileExtension) {
        return exports._fileDescMap[fileExtension] || MS.QueryBox.Strings.unknown;
    }
    exports.getFileDescription = getFileDescription;

    /**
    * Gets a list of URL's from a list of sites.
    *
    * @param sitesIFollow A list of followed sites as returned by SP REST.
    * @return A list of urls.
    */
    function getSiteIFollowUrls(sitesIFollow) {
        if (!sitesIFollow || typeof sitesIFollow.length !== "number") {
            throw new Error("Parameter sitesIFollow must be an array.");
        }

        var urls = [];
        for (var i = 0; i < sitesIFollow.length; i++) {
            urls.push(sitesIFollow[i]["url"]);
        }

        return urls;
    }
    exports.getSiteIFollowUrls = getSiteIFollowUrls;

    /**
    * Interleave two result sets and remove duplicates by DocId.
    *
    * @param results Array of result sets to interleave.
    *
    * @return Array of results without duplicates
    */
    function interleaveResults(results) {
        var inter = _.splat(_.interleave)(results);
        return _.distinct(_.compact(inter), "DocId");
    }
    exports.interleaveResults = interleaveResults;

    var strings = window["MS"] && MS.QueryBox && MS.QueryBox.Strings || {};

    exports._fileDescMap = {
        asax: strings.asax,
        ascx: strings.ascx,
        asmx: strings.asmx,
        asp: strings.web,
        aspx: strings.web,
        htm: strings.web,
        html: strings.web,
        icon: strings.web,
        doc: strings.doc,
        docm: strings.doc,
        docx: strings.doc,
        eml: strings.eml,
        jpe: strings.jpg,
        jpeg: strings.jpg,
        jpg: strings.jpg,
        js: strings.js,
        jse: strings.jse,
        log: strings.log,
        mht: strings.mht,
        mhtml: strings.mht,
        mpp: strings.mpp,
        mps: strings.mps,
        mpt: strings.mpt,
        mpw: strings.mpw,
        mpx: strings.mpx,
        msg: strings.msg,
        one: strings.one,
        onepkg: strings.onepkg,
        onetoc2: strings.onetoc2,
        png: strings.png,
        ppt: strings.ppt,
        pub: strings.pub,
        pptm: strings.pptm,
        pptx: strings.pptx,
        pps: strings.pps,
        rtf: strings.rtf,
        txt: strings.txt,
        wmv: strings.wmv,
        xls: strings.xls,
        xlsb: strings.xlsb,
        xlsm: strings.xlsm,
        xlsx: strings.xlsx,
        xml: strings.xml,
        xps: strings.xps,
        xsd: strings.xsd,
        xsl: strings.xsl,
        xsn: strings.xsn,
        xslt: strings.xslt,
        zip: strings.zip
    };

    

    

    

    

    

    

    /**
    * For working with SharePoint request digests.
    */
    var RequestDigest = (function () {
        function RequestDigest() {
        }
        /**
        * Initializes the digest observable sequence. It works as follows:
        *
        * 1. Check if the digest is present on the page. If so, load it.
        * 2. If the digest isn't present on the page load it from the server.
        * 3. Every 30 minutes, reload the digest from the server.
        *
        * @return A disposable to stop the digest sequence from producing new digests.
        */
        RequestDigest.initializeDigestSequence = function () {
            if (!RequestDigest._requestDigestSequence) {
                var ajaxSettings = {
                    url: exports.getContextInfoUrl()
                };

                var digest = RequestDigest.getRequestDigestFromPage();
                var interval = (digest === RequestDigest._emptyDigest) ? (function (state) {
                    return state && RequestDigest._timeoutMilliSeconds;
                }) : (function () {
                    return RequestDigest._timeoutMilliSeconds;
                });

                RequestDigest._requestDigestSequence = rxt.Observable.generateWithRelativeTime(0, RequestDigest.condition, function (state) {
                    return state + 1;
                }, function (state) {
                    return state;
                }, interval, RequestDigest._scheduler).postJSON(ajaxSettings).select(RequestDigest.getRequestDigest).publishValue(digest);

                return RequestDigest._requestDigestSequence.connect();
            }
        };

        /**
        * The condition for continuing to generate digests.
        */
        RequestDigest.condition = function (state) {
            return true;
        };

        /**
        * Retrieves the digest observable sequence. Subscribe to this sequence to get the latest digest.
        *
        * @return The digest sequence.
        */
        RequestDigest.getDigestSequence = function () {
            if (!RequestDigest._requestDigestSequence) {
                throw new Error("Digest sequence not initialized.");
            }

            return RequestDigest._requestDigestSequence;
        };

        /**
        * Retrieves the request digest value from the document
        *
        * @return The request digest value.
        */
        RequestDigest.getRequestDigestFromPage = function () {
            var digest = RequestDigest._emptyDigest, digestInput;

            if (typeof document !== 'undefined') {
                digestInput = RequestDigest.getRequestDigestContainer();
                if (digestInput) {
                    digest = digestInput.value;
                    this._latestDigest = digest;
                }
            }

            return digest;
        };

        /**
        * Extract requst digest from result. Request digest is needed when
        * querying SharePoint using POST.
        *
        * @param result The result from query to fetch request digest.
        * @return The request digest.
        */
        RequestDigest.getRequestDigest = function (result) {
            if (result && result.d && result.d.GetContextWebInformation && result.d.GetContextWebInformation.FormDigestValue) {
                this._latestDigest = result.d.GetContextWebInformation.FormDigestValue;
            }
            return this._latestDigest;
        };

        /**
        * Retrieves the on-page request digest input container.
        *
        * @return The on-page request digest input container.
        */
        RequestDigest.getRequestDigestContainer = function () {
            return document.getElementById(RequestDigest._requestDigestName);
        };
        RequestDigest._requestDigestName = '__REQUESTDIGEST';
        RequestDigest._requestDigestSequence = null;
        RequestDigest._emptyDigest = '';
        RequestDigest._latestDigest = '';

        RequestDigest._timeoutMilliSeconds = 30 * 60 * 1000 - 10000;
        return RequestDigest;
    })();
    exports.RequestDigest = RequestDigest;

    

    /**
    * Creates a new edges asynchronous map with the specified target member name
    * and message source. The edges map asks for the edges managed property and
    * complements it with person data provided by the specified message source.
    *
    * @param target The name of the target member.
    * @param messageSource The message source that provides people data.
    */
    function edgesAsyncPropMap(target, messageSource) {
        _.asrt(_.isString, "Target must be a string.", target);
        _.asrt(_.isObject, "Message source must be specified.", messageSource);
        var source = "Edges", mapMembers = {
            getSources: _.k([source]),
            getTarget: _.k(target)
        }, sequence = messageSource.where(function (m) {
            return m.getType() === msg.MessageTypes.relatedPeopleMessage;
        }).take(1).select(function (m) {
            return _.indexBy(m.getData(), _.getter("DocId"));
        }).select(function (people) {
            return map.propMap(source, target, _.bind(exports.processEdges, people));
        }).publishLast();
        sequence.connect();
        return _.extend(sequence, mapMembers);
    }
    exports.edgesAsyncPropMap = edgesAsyncPropMap;

    /**
    * Process edges information, parse from JSON and improve. Attempts to add
    * Actor information on all edges.
    *
    * @param people A doc id to people dictionary.
    * @param serializedEdges The edges JSON to process.
    */
    function processEdges(people, serializedEdges) {
        if (!serializedEdges) {
            return serializedEdges;
        }
        var edges = JSON.parse(serializedEdges);
        edges.forEach(function (edge) {
            var edgeData = edge.Properties.Blob.length > 0 ? JSON.parse(utils.charCodesToString(edge.Properties.Blob)) : {};
            if (edgeData.ActorId && people[edgeData.ActorId]) {
                edge.Actor = people[edgeData.ActorId];
            }

            // Expose ActorCount to the world too.
            if (edgeData.ActorCount) {
                edge.ActorCount = edgeData.ActorCount;
            }
        });
        return edges;
    }
    exports.processEdges = processEdges;
});

//
// Module: ../ext/rx.binding
//

define.names.push("../ext/rx.binding");
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.txt in the project root for license information.

(function (root, factory) {
    var freeExports = typeof exports == 'object' && exports &&
    (typeof root == 'object' && root && root == root.global && (window = root), exports);

    // Because of build optimizers
    if (typeof define === 'function' && define.amd) {
        define(['../ext/rx', 'exports'], function (Rx, exports) {
            root.Rx = factory(root, exports, Rx);
            return root.Rx;
        });
    } else if (typeof module == 'object' && module && module.exports == freeExports) {
        module.exports = factory(root, module.exports, require('./rx'));
    } else {
        root.Rx = factory(root, {}, root.Rx);
    }
}(this, function (global, exp, root, undefined) {
    
    var Observable = root.Observable,
        observableProto = Observable.prototype,
        AnonymousObservable = root.Internals.AnonymousObservable,
        Subject = root.Subject,
        AsyncSubject = root.AsyncSubject,
        Observer = root.Observer,
        ScheduledObserver = root.Internals.ScheduledObserver,
        disposableCreate = root.Disposable.create,
        disposableEmpty = root.Disposable.empty,
        CompositeDisposable = root.CompositeDisposable,
        currentThreadScheduler = root.Scheduler.currentThread,
        inherits = root.Internals.inherits,
        addProperties = root.Internals.addProperties;

    // Utilities
    var objectDisposed = 'Object has been disposed';
    function checkDisposed() {
        if (this.isDisposed) {
            throw new Error(objectDisposed);
        }
    }

    /**
     * Multicasts the source sequence notifications through an instantiated subject into all uses of the sequence within a selector function. Each
     * subscription to the resulting sequence causes a separate multicast invocation, exposing the sequence resulting from the selector function's
     * invocation. For specializations with fixed subject types, see Publish, PublishLast, and Replay.
     * 
     * 1 - res = source.multicast(observable);
     * 2 - res = source.multicast(function () { return new Subject(); }, function (x) { return x; });
     * 
     * @param subjectOrSubjectSelector 
     * Factory function to create an intermediate subject through which the source sequence's elements will be multicast to the selector function.
     * Or:
     * Subject to push source elements into.
     * 
     * @param selector [Optional] Selector function which can use the multicasted source sequence subject to the policies enforced by the created subject. Specified only if <paramref name="subjectOrSubjectSelector" is a factory function.
     * @return An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
     */
    observableProto.multicast = function (subjectOrSubjectSelector, selector) {
        var source = this;
        return typeof subjectOrSubjectSelector === 'function' ?
            new AnonymousObservable(function (observer) {
                var connectable = source.multicast(subjectOrSubjectSelector());
                return new CompositeDisposable(selector(connectable).subscribe(observer), connectable.connect());
            }) :
            new ConnectableObservable(source, subjectOrSubjectSelector);
    };

    /**
     * Returns an observable sequence that is the result of invoking the selector on a connectable observable sequence that shares a single subscription to the underlying sequence.
     * This operator is a specialization of Multicast using a regular Subject.
     * 
     * 1 - res = source.publish();
     * 2 - res = source.publish(function (x) { return x; });
     * 
     * @param selector [Optional] Selector function which can use the multicasted source sequence as many times as needed, without causing multiple subscriptions to the source sequence. Subscribers to the given source will receive all notifications of the source from the time of the subscription on.
     * @return An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
     */
    observableProto.publish = function (selector) {
        return !selector ?
            this.multicast(new Subject()) :
            this.multicast(function () {
                return new Subject();
            }, selector);
    };

    /**
     * Returns an observable sequence that is the result of invoking the selector on a connectable observable sequence that shares a single subscription to the underlying sequence containing only the last notification.
     * This operator is a specialization of Multicast using a AsyncSubject.
     * 
     * 1 - res = source.publishLast();
     * 2 - res = source.publishLast(function (x) { return x; });
     * 
     * @param selector [Optional] Selector function which can use the multicasted source sequence as many times as needed, without causing multiple subscriptions to the source sequence. Subscribers to the given source will only receive the last notification of the source.
     * @return An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
     */
    observableProto.publishLast = function (selector) {
        return !selector ?
            this.multicast(new AsyncSubject()) :
            this.multicast(function () {
                return new AsyncSubject();
            }, selector);
    };

    /**
     * Returns an observable sequence that is the result of invoking the selector on a connectable observable sequence that shares a single subscription to the underlying sequence and starts with initialValue.
     * This operator is a specialization of Multicast using a BehaviorSubject.
     * 
     * 1 - res = source.publishValue(42);
     * 2 - res = source.publishLast(function (x) { return x.select(function (y) { return y * y; }) }, 42);
     * 
     * @param selector [Optional] Selector function which can use the multicasted source sequence as many times as needed, without causing multiple subscriptions to the source sequence. Subscribers to the given source will receive immediately receive the initial value, followed by all notifications of the source from the time of the subscription on.
     * @param initialValue Initial value received by observers upon subscription.
     * @return An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
     */
    observableProto.publishValue = function (initialValueOrSelector, initialValue) {
        return arguments.length === 2 ?
            this.multicast(function () {
                return new BehaviorSubject(initialValue);
            }, initialValueOrSelector) :
            this.multicast(new BehaviorSubject(initialValueOrSelector));
    };

    /**
     * Returns an observable sequence that is the result of invoking the selector on a connectable observable sequence that shares a single subscription to the underlying sequence replaying notifications subject to a maximum time length for the replay buffer.
     * This operator is a specialization of Multicast using a ReplaySubject.
     * 
     * 1 - res = source.replay(null, 3);
     * 2 - res = source.replay(null, 3, 500);
     * 3 - res = source.replay(null, 3, 500, scheduler);
     * 4 - res = source.replay(function (x) { return x.take(6).repeat(); }, 3, 500, scheduler);
     * 
     * @param selector [Optional] Selector function which can use the multicasted source sequence as many times as needed, without causing multiple subscriptions to the source sequence. Subscribers to the given source will receive all the notifications of the source subject to the specified replay buffer trimming policy.
     * @param bufferSize [Optional] Maximum element count of the replay buffer.
     * @param window [Optional] Maximum time length of the replay buffer.
     * @param scheduler [Optional] Scheduler where connected observers within the selector function will be invoked on.
     * @return An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
     */
    observableProto.replay = function (selector, bufferSize, window, scheduler) {
        return !selector ?
            this.multicast(new ReplaySubject(bufferSize, window, scheduler)) :
            this.multicast(function () {
                return new ReplaySubject(bufferSize, window, scheduler);
            }, selector);
    };

    var InnerSubscription = function (subject, observer) {
        this.subject = subject;
        this.observer = observer;
    };
    InnerSubscription.prototype.dispose = function () {
        if (!this.subject.isDisposed && this.observer !== null) {
            var idx = this.subject.observers.indexOf(this.observer);
            this.subject.observers.splice(idx, 1);
            this.observer = null;
        }
    };

    /**
     *  Represents a value that changes over time.
     *  Observers can subscribe to the subject to receive the last (or initial) value and all subsequent notifications.
     */
    var BehaviorSubject = root.BehaviorSubject = (function () {
        function subscribe(observer) {
            var ex;
            checkDisposed.call(this);
            if (!this.isStopped) {
                this.observers.push(observer);
                observer.onNext(this.value);
                return new InnerSubscription(this, observer);
            }
            ex = this.exception;
            if (ex) {
                observer.onError(ex);
            } else {
                observer.onCompleted();
            }
            return disposableEmpty;
        }

        inherits(BehaviorSubject, Observable);

        /**
         *  Initializes a new instance of the BehaviorSubject class which creates a subject that caches its last value and starts with the specified value.
         *  
         *  @param value Initial value sent to observers when no other value has been received by the subject yet.
         */       
        function BehaviorSubject(value) {
            BehaviorSubject.super_.constructor.call(this, subscribe);

            this.value = value,
            this.observers = [],
            this.isDisposed = false,
            this.isStopped = false,
            this.exception = null;
        }

        addProperties(BehaviorSubject.prototype, Observer, {
            onCompleted: function () {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var os = this.observers.slice(0);
                    this.isStopped = true;
                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onCompleted();
                    }

                    this.observers = [];
                }
            },
            onError: function (error) {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var os = this.observers.slice(0);
                    this.isStopped = true;
                    this.exception = error;

                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onError(error);
                    }

                    this.observers = [];
                }
            },
            onNext: function (value) {
                checkDisposed.call(this);
                if (!this.isStopped) {
                    this.value = value;
                    var os = this.observers.slice(0);
                    for (var i = 0, len = os.length; i < len; i++) {
                        os[i].onNext(value);
                    }
                }
            },
            dispose: function () {
                this.isDisposed = true;
                this.observers = null;
                this.value = null;
                this.exception = null;
            }
        });

        return BehaviorSubject;
    }());

    // Replay Subject
    /**
     * Represents an object that is both an observable sequence as well as an observer.
     * Each notification is broadcasted to all subscribed and future observers, subject to buffer trimming policies.
     */  
    var ReplaySubject = root.ReplaySubject = (function (base) {
        var RemovableDisposable = function (subject, observer) {
            this.subject = subject;
            this.observer = observer;
        };

        RemovableDisposable.prototype.dispose = function () {
            this.observer.dispose();
            if (!this.subject.isDisposed) {
                var idx = this.subject.observers.indexOf(this.observer);
                this.subject.observers.splice(idx, 1);
            }
        };

        function subscribe(observer) {
            var so = new ScheduledObserver(this.scheduler, observer),
                subscription = new RemovableDisposable(this, so);
            checkDisposed.call(this);
            this._trim(this.scheduler.now());
            this.observers.push(so);

            var n = this.q.length;

            for (var i = 0, len = this.q.length; i < len; i++) {
                so.onNext(this.q[i].value);
            }

            if (this.hasError) {
                n++;
                so.onError(this.error);
            } else if (this.isStopped) {
                n++;
                so.onCompleted();
            }

            so.ensureActive(n);
            return subscription;
        }

        inherits(ReplaySubject, Observable);

        /**
         *  Initializes a new instance of the ReplaySubject class with the specified buffer size, window and scheduler.
         * 
         *  @param {Number} [bufferSize] Maximum element count of the replay buffer.
         *  @param {Number} [window] Maximum time length of the replay buffer.
         *  @param [scheduler] Scheduler the observers are invoked on.
         */
        function ReplaySubject(bufferSize, window, scheduler) {
            this.bufferSize = bufferSize == null ? Number.MAX_VALUE : bufferSize;
            this.window = window == null ? Number.MAX_VALUE : window;
            this.scheduler = scheduler || currentThreadScheduler;
            this.q = [];
            this.observers = [];
            this.isStopped = false;
            this.isDisposed = false;
            this.hasError = false;
            this.error = null;
            ReplaySubject.super_.constructor.call(this, subscribe);
        }

        addProperties(ReplaySubject.prototype, Observer, {
            _trim: function (now) {
                while (this.q.length > this.bufferSize) {
                    this.q.shift();
                }
                while (this.q.length > 0 && (now - this.q[0].interval) > this.window) {
                    this.q.shift();
                }
            },
            onNext: function (value) {
                var observer;
                checkDisposed.call(this);
                if (!this.isStopped) {
                    var now = this.scheduler.now();
                    this.q.push({ interval: now, value: value });
                    this._trim(now);

                    var o = this.observers.slice(0);
                    for (var i = 0, len = o.length; i < len; i++) {
                        observer = o[i];
                        observer.onNext(value);
                        observer.ensureActive();
                    }
                }
            },
            onError: function (error) {
                var observer;
                checkDisposed.call(this);
                if (!this.isStopped) {
                    this.isStopped = true;
                    this.error = error;
                    this.hasError = true;
                    var now = this.scheduler.now();
                    this._trim(now);
                    var o = this.observers.slice(0);
                    for (var i = 0, len = o.length; i < len; i++) {
                        observer = o[i];
                        observer.onError(error);
                        observer.ensureActive();
                    }
                    this.observers = [];
                }
            },
            onCompleted: function () {
                var observer;
                checkDisposed.call(this);
                if (!this.isStopped) {
                    this.isStopped = true;
                    var now = this.scheduler.now();
                    this._trim(now);
                    var o = this.observers.slice(0);
                    for (var i = 0, len = o.length; i < len; i++) {
                        observer = o[i];
                        observer.onCompleted();
                        observer.ensureActive();
                    }
                    this.observers = [];
                }
            },
            dispose: function () {
                this.isDisposed = true;
                this.observers = null;
            }
        });

        return ReplaySubject;
    }());

    var ConnectableObservable = (function () {
        inherits(ConnectableObservable, Observable);
        function ConnectableObservable(source, subject) {
            var state = {
                subject: subject,
                source: source.asObservable(),
                hasSubscription: false,
                subscription: null
            };

            this.connect = function () {
                if (!state.hasSubscription) {
                    state.hasSubscription = true;
                    state.subscription = new CompositeDisposable(state.source.subscribe(state.subject), disposableCreate(function () {
                        state.hasSubscription = false;
                    }));
                }
                return state.subscription;
            };

            var subscribe = function (observer) {
                return state.subject.subscribe(observer);
            };
            ConnectableObservable.super_.constructor.call(this, subscribe);
        }

        ConnectableObservable.prototype.connect = function () { return this.connect(); };
        ConnectableObservable.prototype.refCount = function () {
            var connectableSubscription = null,
            count = 0,
            source = this;
            return new AnonymousObservable(function (observer) {
                var shouldConnect, subscription;
                count++;
                shouldConnect = count === 1;
                subscription = source.subscribe(observer);
                if (shouldConnect) {
                    connectableSubscription = source.connect();
                }
                return disposableCreate(function () {
                    subscription.dispose();
                    count--;
                    if (count === 0) {
                        connectableSubscription.dispose();
                    }
                });
            });
        };

        return ConnectableObservable;
    }());

    return root;
}));
//
// Module: plugin2
//

define.names.push("plugin2");
define(["require", "exports", "../ext/msfuncy-0.9", "../ext/rx", "../ext/rx.binding", "msg"], function(require, exports, _, rx, rxb, msg) {
    function assertValue(name, value) {
        if (!value) {
            throw new Error("Parameter " + name + " must be specified.");
        }
    }

    /**
    * Represents the service functionality the O365 QueryBox offers to the
    * plugins.
    */
    var PluginService = (function () {
        /**
        * Initializes a new instance of the plugin service with the specified
        * client id.
        *
        * @param clientId The client id.
        * @param clientVersion The client version number.
        */
        function PluginService(clientId, clientVersion) {
            var that = this;
            that._clientId = clientId;
            that._clientVersion = clientVersion;
            that._queryLifecycleSubject = new rx.Subject();
            that._messageSubject = new rxb.ReplaySubject();
        }
        /**
        * Get the id of the client using this plugin service.
        */
        PluginService.prototype.getClientId = function () {
            return this._clientId;
        };

        /**
        * Get the version number of the client using this plugin service.
        */
        PluginService.prototype.getClientVersion = function () {
            return this._clientVersion;
        };

        /**
        * Turns a query into a query lifecycle.
        *
        * @param query The query to turn into a query lifecycle.
        */
        PluginService.prototype._toQueryLifecycle = function (query) {
            if (query === null) {
                throw new Error("Parameter query must not be null.");
            }
            return new QueryLifecycle(query);
        };

        /**
        * Get the query message hub.
        */
        PluginService.prototype.query = function () {
            return this._queryLifecycleSubject;
        };

        /**
        * Get the message subject used to exchange data between plugins.
        */
        PluginService.prototype.message = function () {
            return this._messageSubject;
        };

        /**
        * Set a new query to be processed by the plugins that have subscribed
        * to the query message hub.
        *
        * @param newQuery The query to process.
        */
        PluginService.prototype.setQuery = function (newQuery) {
            var that = this, tl = that._toQueryLifecycle(newQuery), prevTl = that._previousQueryLifecycle;
            prevTl && prevTl.dispose();
            that._queryLifecycleSubject.onNext(tl);
            tl.mergeProgressSources();
            that._previousQueryLifecycle = tl;
        };
        return PluginService;
    })();
    exports.PluginService = PluginService;

    /**
    * A message that indicates that the progress sources have been merged in
    * the term lifecycle, and that progress messaging has been started.
    */
    var GoMessage = (function () {
        function GoMessage() {
        }
        return GoMessage;
    })();
    exports.GoMessage = GoMessage;

    /**
    * Represents a query's lifecyle.
    */
    var QueryLifecycle = (function () {
        /**
        * Initializes a new term lifecycle instance with the specified term.
        *
        * @param term The term the user typed into the QueryBox.
        */
        function QueryLifecycle(query) {
            this._plugins = [];
            this._progressSources = [];
            this._isDisposed = false;
            this._isMerged = false;
            var that = this;
            that._query = query;
            var progressSubject = new rxb.ReplaySubject();
            progressSubject.subscribe(null, null, function () {
                return that._isDisposed = true;
            });
            that._progressSubject = progressSubject;
            var ps = that.createProgressSource({
                getId: function () {
                    return QueryLifecycle.progressSourceId;
                }
            });
            ps.onNext(new GoMessage());
            ps.onCompleted();
        }
        /**
        * Get the query.
        */
        QueryLifecycle.prototype.getQuery = function () {
            return this._query;
        };

        /**
        * Initializes a new progress source and registers it with the term
        * lifecycle. The created source is the source of any progress that the
        * plugin wants to share with other plugins. Plugins registering for
        * participation in the lifecycle is required to complete the
        * source, by calling its onCompleted method.
        *
        * @param source The message source.
        */
        QueryLifecycle.prototype.createProgressSource = function (source) {
            assertValue("source", source);
            var that = this;
            if (that._isMerged) {
                throw new Error("Progress sources have been merged. " + "The progress source must be created at an earlier stage.");
            }
            var id = source.getId();
            if (!id) {
                throw new Error("Specified plugin has no id.");
            }
            if (that._isProgressSourceCreated(id)) {
                throw new Error('There has already been created a progress ' + 'source for plugin with id "' + id + '" for this term lifecycle.');
            }
            var rs = new rxb.ReplaySubject();
            that._progressSources.push(rs.select(function (data) {
                return new msg.Message("progress", source, data);
            }));
            that._plugins.push(source);
            return rs;
        };

        QueryLifecycle.prototype._isProgressSourceCreated = function (id) {
            return isIdInPluginList(id, this._plugins);
        };

        /**
        * Triggered when one of the plugin chooses to share information.
        */
        QueryLifecycle.prototype.progress = function () {
            return this._progressSubject;
        };

        /**
        * Merges the progress sources and starts the progress event hub.
        */
        QueryLifecycle.prototype.mergeProgressSources = function () {
            var that = this;
            if (that._isMerged) {
                throw new Error("Progress sources must not be merged more than once.");
            }
            that._isMerged = true;
            that._mergeSubscription = rx.Observable.merge.apply(rx.Observable, that._progressSources).select(function (p) {
                var sp = p, plugins = that._plugins;
                sp.getRecipients = function () {
                    return plugins;
                };
                sp.hasRecipient = function (id) {
                    return isIdInPluginList(id, plugins);
                };
                return sp;
            }).subscribe(that._progressSubject);
        };

        /**
        * Get a value indicating if the term lifecycle is disposed or not.
        */
        QueryLifecycle.prototype.isDisposed = function () {
            return this._isDisposed;
        };

        /**
        * Disposes the term lifecycle.
        */
        QueryLifecycle.prototype.dispose = function () {
            var that = this;
            if (that._isDisposed) {
                return;
            }
            that._isDisposed = true;
            that._mergeSubscription.dispose();
            that._progressSubject.onCompleted();
        };

        QueryLifecycle.prototype.hasValidProperty = function (key) {
            return key in this._query.getProperties() && this._query.getProperties()[key];
        };
        QueryLifecycle.progressSourceId = "query-lifecycle";
        return QueryLifecycle;
    })();
    exports.QueryLifecycle = QueryLifecycle;

    /**
    * Returns a boolan value indicating if the specified id is found inside
    * the message source list.
    */
    function isIdInPluginList(id, sources) {
        for (var i = 0; i < sources.length; i++) {
            if (sources[i].getId() === id) {
                return true;
            }
        }
        return false;
    }

    /**
    * Represents a query.
    */
    var Query = (function () {
        function Query(properties) {
            this._properties = properties;
        }
        /**
        * Get an immutable version of the query properties.
        */
        Query.prototype.getProperties = function () {
            return this._properties;
        };
        return Query;
    })();
    exports.Query = Query;

    

    

    

    

    

    

    /**
    * Filters progress based on plugin id.
    */
    function pluginProgressFilter(plugins) {
        _.asrt(_.isArray, "Plugins argument must be an array.", plugins);
        return function (progress) {
            _.asrt(_.isObject, "Progress argument must be an object.", progress);
            return plugins.indexOf(progress.getSource().getId()) !== -1;
        };
    }
    exports.pluginProgressFilter = pluginProgressFilter;
});

//
// Module: actor
//

define.names.push("actor");
define(["require", "exports", "../ext/msfuncy-0.9", "../ext/rx.html", "registry", "msg", "utils", "sputils"], function(require, exports, _, rxh, reg, msg, utils, sputils) {
    var ActorPlugin = (function () {
        function ActorPlugin() {
            var _this = this;
            /**
            * Initializes the actor plugin.
            */
            this.initialize = _.explain("ActorPlugin: initialize", function (pluginService) {
                var that = _this, msgHub = pluginService.message(), requestProperties = { requestId: utils.newGuid() }, url = "/_api/search/query?QueryTemplate='{User.email}'" + "&SourceId='b09a7990-05ea-4af9-81ef-edfab16c4e31'" + "&RowLimit=1&StartRow=0&ClientType='" + encodeURIComponent(pluginService.getClientId()) + "'&BypassResultTypes=true", path = ActorPlugin.userIdPath.split("."), actorIds = {};

                function getEmail(ql) {
                    return ql.getQuery().getProperties()[reg.queryProperties.email];
                }

                // Happens for every query with email query property.
                pluginService.query().subscribe(function (ql) {
                    var progressSource = ql.createProgressSource(that), email = getEmail(ql), cachedId = actorIds[email];

                    // Emitting my actor id.
                    if (!email) {
                        progressSource.onNext(reg.myActorId);
                        progressSource.onCompleted();
                        return;
                    }

                    // Emitting any cached actor id.
                    if (typeof cachedId !== "undefined") {
                        progressSource.onNext(cachedId);
                        progressSource.onCompleted();
                        return;
                    }

                    // Notify the world that we are fetching actor data.
                    msgHub.onNext(new msg.Message(msg.MessageTypes.logMessage, that, msg.logMessage(ActorPlugin.logTypes.request, requestProperties)));

                    var ajaxSubscription = rxh.Observable.ajax({
                        url: url.replace("{User.email}", encodeURIComponent(email)),
                        method: 'GET',
                        headers: { "ACCEPT": "application/json;odata=verbose" },
                        async: true
                    }).doAction(function (res) {
                        return msgHub.onNext(new msg.Message(msg.MessageTypes.logMessage, that, msg.logMessage(ActorPlugin.logTypes.response, requestProperties)));
                    }).select(_.explain("ActorPlugin", sputils.jsonResponseProcessor(path))).subscribe(function (id) {
                        actorIds[email] = id;
                        progressSource.onNext(id);
                        progressSource.onCompleted();
                    }, function (error) {
                        msgHub.onNext(new msg.Message(msg.MessageTypes.errorMessage, that, error));
                        progressSource.onCompleted();
                    });

                    ql.progress().subscribe(undefined, undefined, function () {
                        return ajaxSubscription.dispose();
                    });
                });
            });
        }
        /**
        * Get the plugin id.
        */
        ActorPlugin.prototype.getId = function () {
            return "actor";
        };
        ActorPlugin.logTypes = {
            /**
            * Identifies a request log entry.
            */
            request: "actorPluginRequest",
            /**
            * Identifies a response log entry.
            */
            response: "actorPluginResponse"
        };

        ActorPlugin.userIdPath = "d.query.PrimaryQueryResult.RelevantResults.Table." + "Rows.results.0.Cells.results.[Key='DocId'].Value";
        return ActorPlugin;
    })();
    exports.ActorPlugin = ActorPlugin;
});

//
// Module: datasourcebase
//

define.names.push("datasourcebase");
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define(["require", "exports", "../ext/msfuncy-0.9", "../ext/rx", "utils"], function(require, exports, _, rx, utils) {
    /**
    * Wrapper for loading and saving items to and from Web Browser session storage.
    */
    var DataSourceSessionStorage = (function () {
        function DataSourceSessionStorage() {
        }
        /**
        * Loads the value in session storage associated with the supplied key.
        *
        * @param key Key to do lookup on.
        * @return Value associated with the supplied key.
        */
        DataSourceSessionStorage.prototype.load = function (key) {
            try  {
                return sessionStorage.getItem(key);
            } catch (e) {
                // TODO: Log that we couldn't get item. And this log message
                // should likely occur just once to avoid flooding.
                return null;
            }
        };

        /**
        * Saves a value to session storage, keyed by the supplied key.
        *
        * @param key Key to associate value with.
        * @param value Value to store in session storage.
        */
        DataSourceSessionStorage.prototype.save = function (key, value) {
            try  {
                sessionStorage.setItem(key, value);
            } catch (e) {
                // TODO: Log that we couldn't store item. And this log message
                // should likely occur just once to avoid flooding.
            }
        };
        return DataSourceSessionStorage;
    })();
    exports.DataSourceSessionStorage = DataSourceSessionStorage;

    (function (Internal) {
        /**
        * Represents an item in the data source cache.
        */
        var DataSourceCacheItem = (function () {
            /**
            * Initializes a new cache item with the supplied observable.
            *
            * @param obs Observable on which the value for this cache item should be delivered.
            * @param fetched Time, in milliseconds sinsce 1970, when cache item was fetched.
            * @param value The value to cache.
            */
            function DataSourceCacheItem(obs, fetched, value) {
                this._obs = obs;

                if (fetched) {
                    this._fetched = fetched;
                }

                if (value) {
                    this._value = value;
                }
            }
            /**
            * Given a refresh interval, determines whether this cache item has expired or not.
            * E.g: If a cache item was created at t=9, and refresh interval is r=2, it
            * would expire at t=11.
            *
            * @param refreshIntervalMs Refresh intervall in milliseconds.
            * @return true if this cache item has expired; false, if not.
            */
            DataSourceCacheItem.prototype.expired = function (refreshIntervalMs) {
                var refreshThreshold = utils.now() - refreshIntervalMs;
                return this._fetched <= refreshThreshold;
            };

            /**
            * Returns whether or not the value of this cache item has been fetched.
            *
            * @return true if fetch is pending; false, if not (see setValue).
            */
            DataSourceCacheItem.prototype.fetchPending = function () {
                return !!this._obs;
            };

            /**
            * Gets the observable on which the value for this cache item should be delivered.
            *
            * @return The observable on which the value for this cache item should be delivered.
            */
            DataSourceCacheItem.prototype.getObservable = function () {
                return this._obs;
            };

            /**
            * Gets the value of this cache item.
            *
            * @return The value of this cache item..
            */
            DataSourceCacheItem.prototype.getValue = function () {
                return this._value;
            };

            /**
            * Sets the value of this cache item.
            *
            * @param value The new value of this cache item..
            */
            DataSourceCacheItem.prototype.setValue = function (value) {
                this._fetched = utils.now();
                this._obs = null;
                this._value = value;
            };
            return DataSourceCacheItem;
        })();
        Internal.DataSourceCacheItem = DataSourceCacheItem;
    })(exports.Internal || (exports.Internal = {}));
    var Internal = exports.Internal;

    /**
    * Represents an OIL data source.
    */
    var DataSourceBase = (function () {
        /**
        * Initializes a new data source instance.
        *
        * @param id The id of the current data source instance.
        * @param version The version of the current data source instance.
        * @param storage Construct to use as cache storage.
        * @param refreshIntervalMs Expire cache items after this many milliseconds.
        *        The first request for an expired cache item will cause it to be re-fetched.
        *        If no value is provided, a cache item will not expire.
        */
        function DataSourceBase(id, version, storage, refreshIntervalMs) {
            this._id = id;
            this._refreshIntervalMs = refreshIntervalMs || Number.MAX_VALUE;
            this._version = version;
            this.load = storage.load;
            this.save = storage.save;
            this.initCache();
        }
        /**
        * Fetches an item new in the cache. Needs to be implemented by a sub-class.
        *
        * @param key Key in the cache where the fetched value will be stored. This parameter is a pass-through from getItem.
        * @returns An observable which can be subscribed to in order to get the cache value.
        */
        DataSourceBase.prototype.fetchItem = function (key) {
            throw new Error("Not implemented");
        };

        /**
        * Get the id of this data source.
        *
        * @returns The id of this data source.
        */
        DataSourceBase.prototype.getId = function () {
            return "ms-oil-datasource-" + this._id;
        };

        /**
        * Gets an item from the cache, potentially fetching it if it's not in the cache already.
        *
        * @param key Key to look up in the cache.
        * @return.An observable which can be subscribed to in order to get the cache value.
        */
        DataSourceBase.prototype.getItem = function (key) {
            var that = this, strKey = DataSourceBase.key(key), cache = that._cache, cacheItem = cache[strKey], fetch = !cacheItem || cacheItem.expired(that._refreshIntervalMs);

            if (fetch) {
                var obs = that.fetchItem(key);

                cache[strKey] = cacheItem = new Internal.DataSourceCacheItem(obs);

                obs.subscribe(function (cacheValue) {
                    cacheItem.setValue(cacheValue);
                    that.updateCache();
                });

                return obs;
            } else if (cacheItem && cacheItem.fetchPending()) {
                return cacheItem.getObservable();
            }

            return rx.Observable.returnValue(cacheItem.getValue());
        };

        DataSourceBase.prototype.log = function () {
            return rx.Observable.empty();
        };

        DataSourceBase.prototype.getVersionId = function () {
            return this.getId() + "-version";
        };

        DataSourceBase.prototype.initCache = function () {
            var that = this;
            if (that._version === JSON.parse(that.load(that.getVersionId()))) {
                that._cache = JSON.parse(that.load(that.getId())) || {};
                that.completeLoad();
            } else {
                that._cache = {};
                that.save(that.getVersionId(), JSON.stringify(that._version));
            }
        };

        /**
        * Complete load by replacing objects loaded from storage with new DataSourceCacheItem instances.
        * This to include functions defined by the DataSourceCacheItem class,
        * as we assume functions are lost during serialization and deserialization to and from storage.
        * Note that cache items that were in "fetch pending" state when stored are removed from the cache,
        * as storing these destroys the observable required to do the fetch.
        */
        DataSourceBase.prototype.completeLoad = function () {
            for (var key in this._cache) {
                if (this._cache.hasOwnProperty(key)) {
                    var incompleteItem = this._cache[key];
                    if (incompleteItem['_value']) {
                        this._cache[key] = new Internal.DataSourceCacheItem(null, incompleteItem['_fetched'], incompleteItem['_value']);
                    } else {
                        delete this._cache[key];
                    }
                }
            }
        };

        DataSourceBase.prototype.updateCache = function () {
            this.save(this.getId(), JSON.stringify(this._cache));
        };

        /**
        * Turns the specified key object into an equivalent cache key string
        * representation. Empty properties are ignored. They will not be part
        * of the string representation. An empty property has one of the
        * values empty string, undefined or null. Note that if you specify an
        * object or a function as part of the key object you should make sure
        * that the toString returns what you want to be part of the key.
        *
        * @param key The key object.
        */
        DataSourceBase.key = function (key) {
            _.asrt(_.isObject, "Key argument must be an object.", key);
            var keyParts = [], propKeys = _.keys(key).sort(), numPropKeys = propKeys.length, propKey, val, i = 0;
            for (; i < numPropKeys; i++) {
                (val = key[propKey = propKeys[i]]) === null || val === undefined ? val : (val += "") && keyParts.push(propKey + ":" + val);
            }
            return keyParts.join(",");
        };
        return DataSourceBase;
    })();
    exports.DataSourceBase = DataSourceBase;

    /**
    * Represents a data source backed by session storage.
    */
    var SessionStorageDataSource = (function (_super) {
        __extends(SessionStorageDataSource, _super);
        /**
        * Initializes a new session storage data source instance.
        *
        * @param id The id of the current session storage data source instance.
        * @param version The version of the current session storage data source instance.
        * @param refreshIntervalMs Expire cache items after this many milliseconds.
        *        The first request for an expired cache item will cause it to be re-fetched.
        *        If no value is provided, a cache item will not expire.
        */
        function SessionStorageDataSource(id, version, refreshIntervalMs) {
            _super.call(this, id, version, new DataSourceSessionStorage(), refreshIntervalMs);
        }
        return SessionStorageDataSource;
    })(DataSourceBase);
    exports.SessionStorageDataSource = SessionStorageDataSource;
});

//
// Module: graphdatasource
//

define.names.push("graphdatasource");
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define(["require", "exports", "../ext/msfuncy-0.9", "../ext/rx", "../ext/rx.binding", "../ext/rx.html", "registry", "msg", "map", "utils", "sputils", "datasourcebase"], function(require, exports, _, rx, rxb, rxh, reg, msg, map, utils, sputils, dsbase) {
    var TagQueries = reg.Tags;

    var GraphDataSource = (function (_super) {
        __extends(GraphDataSource, _super);
        function GraphDataSource(id, version, clientType, refreshIntervalMs, propertyMap) {
            _super.call(this, id, version, refreshIntervalMs);
            var primQPath = GraphDataSource._primaryQueryResultPath.split(".");
            this._jsonResponseProc = sputils.jsonResponseProcessor(primQPath);
            this._maps = propertyMap;
            this._resultItemsProc = sputils.resultItemsProcessor(this._maps);
            this._clientType = clientType;
            this._logger = new rxb.Subject();
        }
        /**
        * Create an ajax request based on the input query spec.
        *
        * NOTE: special threatment is added for Tags.modifiedByMe queries, where another (fill in) query
        * will be sent to SharePoint. These results will be appended to the output of the graph query.
        */
        GraphDataSource.prototype.fetchItem = function (spec) {
            var that = this;
            var graphUrl = that.getUrl(map.getSourceNames(that._maps), spec.Tag, spec.ActorId, that._clientType, spec.Term, spec.RowLimit);
            var graphSequence = that.getAjaxSequence(graphUrl, spec.Tag, spec.Term);

            if (spec.Tag !== reg.Tags.modifiedByMe) {
                return graphSequence;
            }

            var spUrl = that.getModifiedByFillInQuery(map.getSourceNames(that._maps), that._clientType, spec.RowLimit, spec.Author);
            var spSequence = that.getAjaxSequence(spUrl, spec.Tag, spec.Term);
            ;

            return graphSequence.combineLatest(spSequence, function (graphData, spData) {
                return _.distinct(graphData.concat(spData), "DocId");
            });
        };

        /**
        * Create an ajax request based on the input url.
        */
        GraphDataSource.prototype.getAjaxSequence = function (url, tag, term) {
            var that = this;

            // Log request start
            var logParams = {
                requestId: utils.newGuid(),
                tag: tag,
                term: term
            };
            that._logger.onNext(msg.logMessage(GraphDataSource.logTypes.request, logParams));

            return rxh.Observable.ajax({
                url: url,
                method: 'GET',
                headers: { "ACCEPT": "application/json;odata=verbose" },
                async: true
            }).doAction(function (res) {
                return that._logger.onNext(msg.logMessage(GraphDataSource.logTypes.response, logParams));
            }).select(_.explain("GraphPluginDataSource", _.pipe(that._jsonResponseProc, function (pqr) {
                return !pqr ? [] : _.oquery(GraphDataSource._resultItemsPath.split("."), pqr);
            }))).selectMany(function (items) {
                return rx.Observable.fromArray(items);
            }).select(_.bind(_.oquery, "Cells.results".split("."))).select(sputils.keyValuesToObject).propmap(that._maps).toArray();
        };

        /**
        * Returns the url to fetch content for with regards to the input
        *
        * @param selectProperties ManagedProperties to include in the results for each item
        * @param scopeTag The scope of this query
        * @param actorId The actor id of the current user
        * @param clientType usedfor logging to track which application made the query
        * @param terms The terms to search for. If not specified '*' is used. I.e., a wild-card search.
        * @param rowLimit Limits the number of rows returned by most tag queries. My Pulse is one exception. If not specified, 50 is used.
        *
        * @return the scope tags querystring
        */
        GraphDataSource.prototype.getUrl = function (selectProperties, scopeTag, actorId, clientType, terms, rowLimit) {
            return TagQueries.getTagQueries(selectProperties, actorId, clientType, terms, rowLimit)[scopeTag];
        };

        GraphDataSource.prototype.getModifiedByFillInQuery = function (selectProperties, clientType, rowLimit, author) {
            author = author && encodeURIComponent('"' + author + '"') || "{User.Name}";
            var queryTemplate = encodeURIComponent("(Author=") + author + encodeURIComponent(") AND (FileExtension:doc OR FileExtension:docx OR FileExtension:ppt OR FileExtension:pptx OR FileExtension:xls OR FileExtension:xlsx OR FileExtension:pdf)");
            return "/_api/search/query?QueryTemplate='" + queryTemplate + "'&SelectProperties='" + selectProperties + "'&SortList='LastModifiedTime:descending'&RowLimit=" + (rowLimit || 50) + "&StartRow=0&ClientType='" + clientType + "'&BypassResultTypes=true";
        };

        /**
        * Provides a log Observable that may be used for listening for log messages.
        *
        * @return Returns an observable sequence of log messages produced by the graph data source.
        */
        GraphDataSource.prototype.log = function () {
            return this._logger.asObservable();
        };
        GraphDataSource.logTypes = {
            /**
            * Identifies a request log entry.
            */
            request: "graphDataSourceRequest",
            /**
            * Identifies a response log entry.
            */
            response: "graphDataSourceResponse"
        };

        GraphDataSource._primaryQueryResultPath = "d.query.PrimaryQueryResult";

        GraphDataSource._resultItemsPath = "RelevantResults.Table.Rows.results";
        return GraphDataSource;
    })(dsbase.SessionStorageDataSource);
    exports.GraphDataSource = GraphDataSource;
});

//
// Module: graphbase
//

define.names.push("graphbase");
define(["require", "exports", "registry", "graphdatasource"], function(require, exports, reg, gds) {
    var qprops = reg.queryProperties;

    var GraphBase = (function () {
        /**
        *
        */
        function GraphBase(maps) {
            var that = this;
            that._refreshInterval = 1000 * 60 * 10;
            that._maps = maps;
            that._dataSource = null;
        }
        GraphBase.prototype.createDataSource = function (id, version, clientType) {
            var that = this;
            return new gds.GraphDataSource(id, version, clientType, that._refreshInterval, that._maps);
        };
        GraphBase.queryProperties = {
            /**
            * Identifies a tag query property.
            */
            tag: qprops.tag,
            /**
            * Identifies a term query property. Provide the raw term. Term is
            * URI encoded by the graph plugin.
            */
            term: qprops.term,
            /**
            * Identifies a raw query url component. Used by GNL queries.
            */
            url: qprops.term,
            /**
            * Identifies an email query. Provide the email to look up here.
            * If not provided, current user is queried instead.
            */
            email: qprops.email,
            /**
            * Identifies a person query by full name. This is used as a person
            * query fallback if email is not set.
            */
            fullName: qprops.fullName
        };

        GraphBase.logTypes = {
            /**
            * Identifies a request log entry.
            */
            request: gds.GraphDataSource.logTypes.request,
            /**
            * Identifies a response log entry.
            */
            response: gds.GraphDataSource.logTypes.response
        };
        return GraphBase;
    })();
    exports.GraphBase = GraphBase;
});

//
// Module: graph
//

define.names.push("graph");
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define(["require", "exports", "../ext/msfuncy-0.9", "registry", "msg", "graphbase"], function(require, exports, _, reg, msg, gbase) {
    var GraphPlugin = (function (_super) {
        __extends(GraphPlugin, _super);
        /**
        * Initializes a new instance of the GraphPlugin class with the specified
        * property maps.
        *
        * @param maps A list of property maps which contain information about how
        * to map source objects to target objects.
        */
        function GraphPlugin(maps) {
            _super.call(this, maps);
            /**
            * Initializes the plugin.
            */
            this.initialize = _.explain("GraphPlugin: initialize", function (pluginService) {
                var that = this, clientType = encodeURIComponent(pluginService.getClientId()), queryProps = GraphPlugin.queryProperties, ds = that.createDataSource(that.getId(), pluginService.getClientVersion(), clientType), getQueryProps = function (ql) {
                    return ql.getQuery().getProperties();
                };
                ds.log().select(function (log) {
                    return new msg.Message(msg.MessageTypes.logMessage, that, log);
                }).subscribe(function (m) {
                    return pluginService.message().onNext(m);
                });

                function getItem(tag, term, actor) {
                    if (reg.Tags.getTags().filter(function (t) {
                        return tag === t;
                    }).length < 1) {
                        throw new Error("GraphPlugin: Unsupported tag: '" + tag + "'");
                    }
                    return ds.getItem({
                        Tag: tag,
                        ActorId: typeof actor === "undefined" ? reg.myActorId : actor,
                        Term: term
                    });
                }

                // Listen for a message from Peoplesuggestion.
                var relPeopleSeq = pluginService.message().where(function (m) {
                    return m.getType() === msg.MessageTypes.relatedPeopleMessage;
                }).select(function (m) {
                    return m.getData();
                }).take(1).publishLast();
                relPeopleSeq.connect();

                getItem(reg.Tags.myPulse).delay(15000, that._scheduler).subscribe(function () {
                    return getItem(reg.Tags.trendingAroundMe).subscribe(function () {
                        return getItem(reg.Tags.viewedByMe).subscribe(function () {
                            return getItem(reg.Tags.modifiedByMe).subscribe(function () {
                                return getItem(reg.Tags.likedByMe).subscribe(function () {
                                    return getItem(reg.Tags.sharedWithMe).subscribe(function () {
                                        return getItem(reg.Tags.presentedToMe).subscribe();
                                    });
                                });
                            });
                        });
                    });
                });

                // Happens for every query.
                pluginService.query().where(function (ql) {
                    return queryProps.tag in getQueryProps(ql) || queryProps.term in getQueryProps(ql);
                }).subscribe(function (ql) {
                    var progressSource = ql.createProgressSource(that), spec = _.values(getQueryProps(ql), [queryProps.tag, queryProps.term]), itemSubscription = ql.progress().where(function (progress) {
                        return progress.getSource().getId() === "actor";
                    }).take(1).select(function (progress) {
                        return progress.getData();
                    }).selectMany(function (docId) {
                        return _.splat(getItem)(_.cat(spec, docId));
                    }).subscribe(function (d) {
                        progressSource.onNext(d);
                        progressSource.onCompleted();
                    }, function (e) {
                        progressSource.onNext([]);
                        pluginService.message().onNext(new msg.Message(msg.MessageTypes.errorMessage, that, e));
                        progressSource.onCompleted();
                    });

                    ql.progress().subscribe(undefined, undefined, function () {
                        return itemSubscription.dispose();
                    });
                });
            });
            _.asrt(_.isArray, "Maps must be an array.", maps);
        }
        /**
        * Get the id.
        */
        GraphPlugin.prototype.getId = function () {
            return "graph";
        };
        return GraphPlugin;
    })(gbase.GraphBase);

    
    return GraphPlugin;
});

//
// Module: search
//

define.names.push("search");
define(["require", "exports", "../ext/msfuncy-0.9", "map", "utils"], function(require, exports, _, map, utils) {
    exports.wordSeparatorRegExp = /\.|\s|-|_/;

    /**
    * Scores an item based on the supplied spesification. Will run throug all properties in the supplied spesification
    * and return an object containing all the scored properties.
    *
    * @param specs Spesifications for wich properties to score and functions to score each property.
    * @param item The item to score.
    * @param terms The terms to score against.
    *
    * @return Returns object with scored properties according to the spesification.
    */
    function scoreItem(specs, item, terms) {
        if (!item) {
            return null;
        }
        var res = {};
        for (var prop in specs) {
            if (specs.hasOwnProperty(prop)) {
                res[prop] = specs[prop](terms, item[prop]);
            }
        }
        return res;
    }
    exports.scoreItem = scoreItem;

    /**
    * Search a list of data based on the supplied spesification. Will run throug all properties in the supplied spesification
    * and return an object containing all the scored properties. Search does not care about sorting. That post prosessing.
    *
    * @param specs Spesifications for wich properties to score and functions to score each property.
    * @param item The item to score.
    * @param term The terms to search.
    *
    * @return Returns object with scored properties according to the spesification.
    */
    function search(specs, terms, data) {
        var results = [], i = 0, item, numItems = data.length;
        for (; i < numItems; i++) {
            item = data[i];
            item && results.push({ score: exports.scoreItem(specs, item, terms), data: item });
        }
        return results;
    }
    exports.search = search;

    /**
    * Filter a list of data based on the result of the boolean predicate
    * function. If the predicate function returns false the object will be
    * filterd out. If object in data is null, it will be filtered out.
    *
    * @param predicate Function to determine if the object is to be filtered
    * out or not.
    * @param scoredData The scored data to be filtered.
    *
    * @return Returns all the objects of the data to be filtered that the
    * predicate function returns true for.
    */
    function filterScoredData(predicate, scoredData) {
        var i = 0, item, numItems = scoredData.length, res = [];
        for (; i < numItems; i++) {
            item = scoredData[i];
            predicate(item.score, item.data) && res.push(item.data);
        }
        return res;
    }
    exports.filterScoredData = filterScoredData;

    /**
    * Higlights all the properites supplied by the spesification.
    *
    * @param specs Spesifications for wich properties to highligh and functions to highlight each property.
    * @param term The term to highlight.
    * @param data The data to highlight.
    *
    * @return Returns all the objects of the data with highlighted properties according to sesification.
    */
    function highlightData(specs, terms, data) {
        var i = 0, item, numItems = data.length, res = [];
        for (; i < numItems; i++) {
            item = _.extend({}, data[i]);
            for (var prop in specs) {
                if (specs.hasOwnProperty(prop)) {
                    if (item[prop]) {
                        item[prop] = specs[prop](terms, item[prop]);
                    }
                }
            }
            res.push(item);
        }
        return res;
    }
    exports.highlightData = highlightData;

    /**
    * Checks if any of the terms are part of a text. If one of the terms has a match in the text, anyWord will return true.
    *
    * @param terms The terms to be matched.
    * @param text The text to match against.
    *
    * @return Returns true if any of the terms has a match in the text. False if no match.
    */
    function anyWord(terms, text) {
        if (!terms || !text) {
            return false;
        }
        var i = 0, itemsLength = terms.length;
        for (; i < itemsLength; i++) {
            if (exports.contains(terms[i], text)) {
                return true;
            }
        }
        return false;
    }
    exports.anyWord = anyWord;

    /**
    * Returns true if all the terms are at the start of the word(s) in text (AND search).
    *
    * @param terms The terms to be matched.
    * @param text The text to match against.
    *
    * @return Returns true if all the terms match the start of one or more word in text. False if no match.
    */
    function prefixWord(terms, text) {
        if (!text || !terms) {
            return false;
        }

        var termHits = {};
        var textSplit = text.split(" ");
        for (var i = 0; i < terms.length; i++) {
            termHits[terms[i]] = false;
            for (var j = 0; j < textSplit.length; j++) {
                if (exports.begins(terms[i], textSplit[j])) {
                    termHits[terms[i]] = true;
                }
            }
        }

        var result = true;
        for (var word in termHits) {
            if (!termHits[word]) {
                result = false;
            }
        }
        return result;
    }
    exports.prefixWord = prefixWord;

    /**
    * Returns true if any of the terms are at the start of the word(s) in text (OR-search).
    *
    * @param terms The terms to be matched.
    * @param text The text to match against.
    *
    * @return Returns true if any of the terms are at the start of the word(s) in text. False if no match.
    */
    function prefixWordOr(terms, text) {
        if (!text || !terms) {
            return false;
        }

        var textSplit = text.split(" ");
        for (var i = 0; i < terms.length; i++) {
            for (var j = 0; j < textSplit.length; j++) {
                if (exports.begins(terms[i], textSplit[j])) {
                    return true;
                }
            }
        }
        return false;
    }
    exports.prefixWordOr = prefixWordOr;

    /**
    * Returns true if term is start of the text.
    *
    * @param term The term to be matched.
    * @param text The text to match against.
    *
    * @return Returns true if text begins with term. False if not at beginning of test, or if input is null.
    */
    function begins(term, text) {
        if (!term || !text) {
            return false;
        }
        if (text.toLowerCase().indexOf(term.toLowerCase()) == 0) {
            return true;
        }
        return false;
    }
    exports.begins = begins;

    /**
    * Checks if the term is part of the text. If the term has a match, contains will return true.
    *
    * @param term The term to be matched.
    * @param text The text to match against.
    *
    * @return Returns true if the term has a match in the text. False if no match.
    */
    function contains(term, text) {
        if (!term || !text) {
            return false;
        }
        if (text.toLowerCase().indexOf(term.toLowerCase()) !== -1) {
            return true;
        }
        return false;
    }
    exports.contains = contains;

    /**
    * Inserts given highlighting tags (<highlightTag></highlightTag>) around the words in wordsToHighlight in subject
    *
    * @param wordsToHighlight A space separated string containing the words that should be highlighted in the text string
    * @param subject The string to perform highlighting on
    * @param highlightTag Hits are highlighted using a tag containing the highlightTag value.
    * @param isPrefixSearch boolean value to decide highlighting based on prefix or infix search. Default infix search.
    *
    * @return A string containing the words highlighted
    */
    function createHighlightedText(wordsToHighlight, subject, highlightTag, searchRegExp) {
        if (wordsToHighlight && subject) {
            // remove any multiple whitespace in the wordsToHighlight string, and split into array on single whitespace.
            // Example: " one   two" => "one two" => ["one", "two"]
            var subjectLowerCase = subject.toLowerCase();

            // Return no highlighting if the search contains no terms
            if (wordsToHighlight.length === 1 && wordsToHighlight[0] === "") {
                return subject;
            }

            var replaceAt = exports.getHighlightIndexes(wordsToHighlight, subjectLowerCase, searchRegExp);

            for (var j = 0; j < replaceAt.length; j++) {
                var replaceOffset = replaceAt[j].offset;
                var replaceWord = replaceAt[j].word;
                var left = subject.slice(0, replaceOffset);
                var word = subject.slice(replaceOffset, replaceOffset + replaceWord.length);
                var right = subject.slice(replaceOffset + replaceWord.length);
                subject = left + "<" + highlightTag + ">" + word + "</" + highlightTag + ">" + right;
            }
        }

        return subject;
    }
    exports.createHighlightedText = createHighlightedText;

    function wildcardHighlight(term, text) {
        return exports.createHighlightedText(term, text, "mark", exports.infixSearchRegExp);
    }
    exports.wildcardHighlight = wildcardHighlight;

    exports.wordSeparators = "\\.|\\s|-|_";

    function prefixSearchRegExp(word) {
        return new RegExp("(^|" + exports.wordSeparators + ")" + escapeRegExp(word), "ig");
    }
    exports.prefixSearchRegExp = prefixSearchRegExp;

    function infixSearchRegExp(word) {
        return new RegExp(escapeRegExp(word), "ig");
    }
    exports.infixSearchRegExp = infixSearchRegExp;

    escapeRegExp:
    function escapeRegExp(str) {
        /// <summary>
        /// Escapes a string, modifying characters used in regexp:
        /// </summary>
        /// <param name="str" type="String" >
        /// The string to escape.
        /// </param>
        /// <returns type="String">
        /// The regexp escaped string.
        /// </returns>
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\//oilcode//");
    }

    /**
    * Finds starting index of all hits in subject for all of the wordsToHighlight based on the searchRegExp function provided
    *
    * @param wordsToHighlight A array of strings to search for.
    * @param subject The string to perform highlighting on.
    * @param searchRegExp regExp for how to hihglight.
    *
    * @return An array of objects cointaining the startindex and the word to highlight. Array is ordered by the highest startindex and decending.
    */
    function getHighlightIndexes(wordsToHighlight, subject, searchRegExp) {
        if (!wordsToHighlight) {
            return [];
        }

        var match;
        subject = subject.toLowerCase();
        var highlightAt = {};

        for (var i = 0; i < wordsToHighlight.length; i++) {
            var regexp = searchRegExp(wordsToHighlight[i].toLowerCase());

            while (match = regexp.exec(subject)) {
                calculateIndexesToHighlightAt(wordsToHighlight[i], match, highlightAt);
            }
        }

        var orderedArray = convertToArrayAndReverseOrder(highlightAt);

        if (orderedArray.length > 0) {
            removeDoubleHighlighting(orderedArray, subject);
        }

        return orderedArray;
    }
    exports.getHighlightIndexes = getHighlightIndexes;

    function removeDoubleHighlighting(array, entireWord) {
        var okIndex = array[array.length - 1].offset + array[array.length - 1].word.length;
        for (var i = array.length - 2; i >= 0; i--) {
            var wordEndIndex = array[i].offset + array[i].word.length - 1;

            /* word starts inside initial word*/
            if (array[i].offset < okIndex) {
                /* word ends outside initial word, so adjust word to remove overlap  */
                if (wordEndIndex > okIndex) {
                    if (array[i].offset < okIndex) {
                        array[i].word = entireWord.substring(okIndex, array[i].offset + array[i].word.length);
                        array[i].offset = okIndex;
                    }
                } else {
                    array.splice(i, 1);
                }
            } else {
                okIndex = wordEndIndex;
            }
        }
    }

    function calculateIndexesToHighlightAt(wordLowerCase, match, highlightAt) {
        var index = exports.wordSeparatorRegExp.test(match[0]) ? match.index + 1 : match.index;

        if (exports.wordSeparatorRegExp.test(wordLowerCase)) {
            index = match.index;
        }

        if (!highlightAt[index] || highlightAt[index].length < wordLowerCase.length) {
            highlightAt[index] = wordLowerCase;
        }
    }

    function convertToArrayAndReverseOrder(objToConvert) {
        var resultAsArray = [];

        for (var prop in objToConvert) {
            if (objToConvert.hasOwnProperty(prop)) {
                resultAsArray.push({ offset: parseInt(prop), word: objToConvert[prop] });
            }
        }

        /* Sort on offset, descending, across all words to be highlighted */
        return resultAsArray.sort(function (x, y) {
            return y.offset - x.offset;
        });
    }

    function tokenizeByCharacter(character) {
        return function (word) {
            return utils.etrim(word).split(character);
        };
    }
    exports.tokenizeByCharacter = tokenizeByCharacter;

    exports.whitespaceTokenizer = exports.tokenizeByCharacter(" ");

    /**
    * Inserts highlighting tags (<i></i>) around wordsToHighlight found in subject
    *
    * @param wordsToHighlight A space separated string containing the words that should be highlighted in the text string
    * @param subject The string to perform highlighting on
    * @param isPrefixSearch boolean value to decide highlighting based on prefix or infix search. Default infix search.
    *
    * @return A string containing the words highlighted
    */
    function createHighlightedTextUsingTagI(wordsToHighlight, subject, isPrefixSearch) {
        if (typeof isPrefixSearch === "undefined") { isPrefixSearch = true; }
        var defaultHighlightTag = "i", searchRegexp = exports.prefixSearchRegExp, tokenizedWords = exports.whitespaceTokenizer(wordsToHighlight);
        if (!isPrefixSearch) {
            tokenizedWords = [wordsToHighlight];
            searchRegexp = exports.infixSearchRegExp;
        }
        return exports.createHighlightedText(tokenizedWords, subject, defaultHighlightTag, searchRegexp);
    }
    exports.createHighlightedTextUsingTagI = createHighlightedTextUsingTagI;

    function prefixHighlightUsingTagMark(term, text) {
        return exports.createHighlightedText(term, text, "mark", exports.prefixSearchRegExp);
    }
    exports.prefixHighlightUsingTagMark = prefixHighlightUsingTagMark;

    /**
    * For infix search: Inserts highlighting tags (<i></i>) around wordsToHighlight found in subject
    *
    * @param wordsToHighlight A space separated string containing the words that should be highlighted in the text string
    * @param subject The string to perform highlighting on
    *
    * @return A string containing the words highlighted
    */
    function infixHighlight(wordsToHighlight, subject) {
        var defaultHighlightTag = "i";
        return exports.createHighlightedText([utils.etrim(wordsToHighlight)], subject, defaultHighlightTag, exports.infixSearchRegExp);
    }
    exports.infixHighlight = infixHighlight;

    /**
    * For prefix search: Inserts highlighting tags (<i></i>) around wordsToHighlight found in subject
    *
    * @param wordsToHighlight A space separated string containing the words that should be highlighted in the text string
    * @param subject The string to perform highlighting on
    *
    * @return A string containing the words highlighted
    */
    function prefixHighlight(wordsToHighlight, subject) {
        var defaultHighlightTag = "i", tokenizedWords = exports.whitespaceTokenizer(wordsToHighlight);
        return exports.createHighlightedText(tokenizedWords, subject, defaultHighlightTag, exports.prefixSearchRegExp);
    }
    exports.prefixHighlight = prefixHighlight;

    /**
    * Prepares function for highlighting properties on a viewmodel.
    * Will highlight based on a term property on the viewmodel.
    * Will use prefixHighlighting or infixHighlighting based on the isPrefixSearch parameter.
    *
    * @param highligthProperty Name of the property to highlight.
    * @param outputProperty Name of the property highlighted.
    */
    function highlightMapper(highligthProperty, outputProperty) {
        return map.propMap(["term", highligthProperty, "isPrefixSearch"], outputProperty, _.splat(exports.createHighlightedTextUsingTagI));
    }
    exports.highlightMapper = highlightMapper;
});

//
// Module: spds
//

define.names.push("spds");
/// <reference path="rxextensions.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define(["require", "exports", "../ext/msfuncy-0.9", "../ext/rx", "../ext/rx.html", "datasourcebase"], function(require, exports, _, rx, rxh, dsbase) {
    rxh.Observable.getJson = function (url) {
        return rx.Observable.ajax({
            url: url,
            method: 'GET',
            headers: { "ACCEPT": "application/json;odata=verbose" }
        }).select(_.explain("getJson: parsing responseText", _.pipe(_.getter("responseText"), JSON.parse)));
    };

    

    /**
    * Represents a SharePoint search data source.
    */
    var SpDataSource = (function (_super) {
        __extends(SpDataSource, _super);
        function SpDataSource() {
            _super.apply(this, arguments);
        }
        SpDataSource.prototype.fetchItem = function (ref) {
            var url = "/_api/search/query?" + ref.query;
            var jsonSequence = rx.Observable.getJson(ref.query);
            return this.map(jsonSequence);
        };

        /**
        * Maps a search result to a custom model. This method is not
        * implemented, and must be specified by consumers.
        */
        SpDataSource.prototype.map = function (searchResult) {
            throw new Error("Not implemented.");
        };
        return SpDataSource;
    })(dsbase.SessionStorageDataSource);
    exports.SpDataSource = SpDataSource;

    

    

    

    

    

    
});

//
// Module: peoplesuggestion
//

define.names.push("peoplesuggestion");
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define(["require", "exports", "../ext/msfuncy-0.9", "msg", "map", "utils", "sputils", "search", "graphbase", "spds"], function(require, exports, _, msg, map, utils, sputils, search, gb, spds) {
    var PeopleSuggestionPlugin = (function (_super) {
        __extends(PeopleSuggestionPlugin, _super);
        /**
        * Initializes a new PeopleSuggestionPlugin
        *
        * @param maps A list of select property maps which contain information.
        * about how to map the result from the search index to a view model.
        * @param maxNumberOfResults The number of results to return from the plugin, default 5.
        */
        function PeopleSuggestionPlugin(maps, maxNumberOfResults) {
            if (typeof maxNumberOfResults === "undefined") { maxNumberOfResults = 5; }
            _super.call(this, maps);
            /**
            * Initializes the plugin.
            */
            this.initialize = _.explain("PeopleSuggestionPlugin: initialize", function (pluginService) {
                var _this = this;
                var that = this, clientType = encodeURIComponent(pluginService.getClientId()), queryPropKeys = PeopleSuggestionPlugin.queryProperties;

                that.dataSource = that.createDataSource(that.getId(), pluginService.getClientVersion(), clientType);

                pluginService.query().subscribe(function (ql) {
                    var progressSource = ql.createProgressSource(that), query = ql.getQuery(), queryProps = query.getProperties(), term = queryProps[queryPropKeys.term], requestProperties = {
                        requestId: utils.newGuid(),
                        tag: PeopleSuggestionPlugin.ScopeTagId,
                        term: term
                    }, msgHub = pluginService.message();

                    //Log message for logging of new querylifecycle
                    msgHub.onNext(new msg.Message(msg.MessageTypes.logMessage, that, msg.logMessage(PeopleSuggestionPlugin.logTypes.request, requestProperties)));

                    //fetch cached peoplesuggestions or fetch data from graph
                    var ajaxSubscription = that.dataSource.getItem({
                        Tag: PeopleSuggestionPlugin.ScopeTagId,
                        ActorId: 'me'
                    }).subscribe(function (d) {
                        var results = d, needFillinData = false;

                        //if there is a term (not initial empty query) we do filtering on the cached results.
                        if (term) {
                            var tokenizedTerm = search.whitespaceTokenizer(term);
                            results = search.search(that.searchSpec, tokenizedTerm, results);
                            results = search.filterScoredData(that.scorePredicate, results);
                            results = search.highlightData(that.higlightSpec, tokenizedTerm, results);
                            needFillinData = results.length < _this.maxNumberOfResults;
                        }
                        progressSource.onNext(results.slice(0, _this.maxNumberOfResults));

                        //if there are less suggestions than the maxNumberOfResults a new datasource is created for filling in people form peoplesearch.
                        if (needFillinData) {
                            //exclude people already in the graph cache
                            var excludeList = [];
                            for (var i = 0; i < results.length; i++) {
                                excludeList.push(results[i].DocId);
                            }
                            if (!_this.peopleDs) {
                                _this.peopleDs = new spds.SpDataSource(_this.getId() + "-fillin", pluginService.getClientVersion());
                                _this.peopleDs.map = (function (obs) {
                                    return obs.select(sputils.mapResults(that._maps));
                                });
                            }
                            _this.peopleDs.getItem({
                                query: PeopleSuggestionPlugin.createPeopleQuery(term, map.getSourceNames(_this._maps), _this._clientType, _this.maxNumberOfResults, excludeList)
                            }).subscribe(function (data) {
                                var fillinResults = data.slice(0, _this.maxNumberOfResults - results.length);
                                fillinResults = search.highlightData(that.higlightSpec, tokenizedTerm, fillinResults);
                                progressSource.onNext(fillinResults);
                                progressSource.onCompleted();
                            });
                        } else {
                            progressSource.onCompleted();
                        }
                        msgHub.onNext(new msg.Message(msg.MessageTypes.relatedPeopleMessage, that, d));
                    }, function (e) {
                        progressSource.onNext([]);
                        msgHub.onNext(new msg.Message(msg.MessageTypes.errorMessage, that, e));
                        progressSource.onCompleted();
                    });

                    ql.progress().subscribe(undefined, undefined, function () {
                        return ajaxSubscription.dispose();
                    });
                });
            });
            this.searchSpec = { PreferredName: search.prefixWord };
            this.higlightSpec = { PreferredName: search.prefixHighlightUsingTagMark };
            this.maxNumberOfResults = maxNumberOfResults;
        }
        /**
        * Get the id.
        */
        PeopleSuggestionPlugin.prototype.getId = function () {
            return "people";
        };

        PeopleSuggestionPlugin.prototype.scorePredicate = function (score) {
            return score.PreferredName;
        };

        /**
        * Creates people query.
        *
        * @param term The term used for searching in the PreferredName managed property
        * @param selectProperties Managed properties to retrieve
        * @param clientType Usedfor logging to track which application made the query
        * @param rowLimit Number of results to get
        * @param excludeList Nullable. Array of docIds of people to exclude from the backend search (people already cached)
        *
        * @return string containing query
        */
        PeopleSuggestionPlugin.createPeopleQuery = function (term, selectProperties, clientType, rowLimit, excludeList) {
            var termArray = utils.etrim(term).split(" ");
            var formattedTerm = termArray.join("%20AND%20PreferredName:");

            var formattedExcludeList = "";
            if (excludeList && excludeList.length > 0) {
                var queryPartForExclude = "%20AND%20-IndexDocId:";
                formattedExcludeList = queryPartForExclude;
                formattedExcludeList += excludeList.join(queryPartForExclude);
            }

            return "/_api/search/query?QueryText='PreferredName:" + formattedTerm + "*" + formattedExcludeList + "'&SelectProperties='" + selectProperties + "'&SourceId='b09a7990-05ea-4af9-81ef-edfab16c4e31" + "'&RankingModelId='d9bfb1a1-9036-4627-83b2-bbd9983ac8a1" + "'&RowLimit=" + rowLimit + "&StartRow=0" + "&ClientType='" + clientType + "'&BypassResultTypes=true";
        };
        PeopleSuggestionPlugin.ScopeTagId = "Related People";
        return PeopleSuggestionPlugin;
    })(gb.GraphBase);

    
    return PeopleSuggestionPlugin;
});

//
// Module: culture
//

define.names.push("culture");
define(["require", "exports"], function(require, exports) {
    exports.cultures = {
        'ar-SA': 1025, 'bg-BG': 1026, 'ca-ES': 1027, 'zh-TW': 1028, 'cs-CZ': 1029, 'da-DK': 1030, 'de-DE': 1031, 'el-GR': 1032, 'en-US': 1033, 'fi-FI': 1035, 'fr-FR': 1036, 'he-IL': 1037, 'hu-HU': 1038, 'is-IS': 1039, 'it-IT': 1040, 'ja-JP': 1041, 'ko-KR': 1042, 'nl-NL': 1043, 'nb-NO': 1044, 'pl-PL': 1045, 'pt-BR': 1046, 'rm-CH': 1047, 'ro-RO': 1048, 'ru-RU': 1049, 'hr-HR': 1050, 'sk-SK': 1051, 'sq-AL': 1052, 'sv-SE': 1053, 'th-TH': 1054, 'tr-TR': 1055, 'ur-PK': 1056, 'id-ID': 1057, 'uk-UA': 1058, 'be-BY': 1059, 'sl-SI': 1060, 'et-EE': 1061, 'lv-LV': 1062, 'lt-LT': 1063, 'tg-Cyrl-TJ': 1064, 'fa-IR': 1065, 'vi-VN': 1066, 'hy-AM': 1067, 'az-Latn-AZ': 1068, 'eu-ES': 1069, 'hsb-DE': 1070, 'mk-MK': 1071, 'tn-ZA': 1074, 'xh-ZA': 1076, 'zu-ZA': 1077, 'af-ZA': 1078, 'ka-GE': 1079, 'fo-FO': 1080, 'hi-IN': 1081, 'mt-MT': 1082, 'se-NO': 1083, 'ms-MY': 1086, 'kk-KZ': 1087, 'ky-KG': 1088, 'sw-KE': 1089, 'tk-TM': 1090, 'uz-Latn-UZ': 1091, 'tt-RU': 1092, 'bn-IN': 1093, 'pa-IN': 1094, 'gu-IN': 1095, 'or-IN': 1096, 'ta-IN': 1097, 'te-IN': 1098, 'kn-IN': 1099, 'ml-IN': 1100, 'as-IN': 1101, 'mr-IN': 1102, 'sa-IN': 1103, 'mn-MN': 1104, 'bo-CN': 1105, 'cy-GB': 1106, 'km-KH': 1107, 'lo-LA': 1108, 'gl-ES': 1110, 'kok-IN': 1111, 'syr-SY': 1114, 'si-LK': 1115, 'chr-Cher-US': 1116, 'iu-Cans-CA': 1117, 'am-ET': 1118, 'ne-NP': 1121, 'fy-NL': 1122, 'ps-AF': 1123, 'fil-PH': 1124, 'dv-MV': 1125, 'ha-Latn-NG': 1128, 'yo-NG': 1130, 'quz-BO': 1131, 'nso-ZA': 1132, 'ba-RU': 1133, 'lb-LU': 1134, 'kl-GL': 1135, 'ig-NG': 1136, 'ti-ET': 1139, 'haw-US': 1141, 'ii-CN': 1144, 'arn-CL': 1146, 'moh-CA': 1148, 'br-FR': 1150, 'ug-CN': 1152, 'mi-NZ': 1153, 'oc-FR': 1154, 'co-FR': 1155, 'gsw-FR': 1156, 'sah-RU': 1157, 'qut-GT': 1158, 'rw-RW': 1159, 'wo-SN': 1160, 'prs-AF': 1164, 'gd-GB': 1169, 'ku-Arab-IQ': 1170, 'ar-IQ': 2049, 'ca-ES-valencia': 2051, 'zh-CN': 2052, 'de-CH': 2055, 'en-GB': 2057, 'es-MX': 2058, 'fr-BE': 2060, 'it-CH': 2064, 'nl-BE': 2067, 'nn-NO': 2068, 'pt-PT': 2070, 'sr-Latn-CS': 2074, 'sv-FI': 2077, 'az-Cyrl-AZ': 2092, 'dsb-DE': 2094, 'tn-BW': 2098, 'se-SE': 2107, 'ga-IE': 2108, 'ms-BN': 2110, 'uz-Cyrl-UZ': 2115, 'bn-BD': 2117, 'pa-Arab-PK': 2118, 'ta-LK': 2121, 'mn-Mong-CN': 2128, 'sd-Arab-PK': 2137, 'iu-Latn-CA': 2141, 'tzm-Latn-DZ': 2143, 'ff-Latn-SN': 2151, 'quz-EC': 2155, 'ti-ER': 2163, 'ar-EG': 3073, 'zh-HK': 3076, 'de-AT': 3079, 'en-AU': 3081, 'es-ES': 3082, 'fr-CA': 3084, 'sr-Cyrl-CS': 3098, 'se-FI': 3131, 'quz-PE': 3179, 'ar-LY': 4097, 'zh-SG': 4100, 'de-LU': 4103, 'en-CA': 4105, 'es-GT': 4106, 'fr-CH': 4108, 'hr-BA': 4122, 'smj-NO': 4155, 'tzm-Tfng-MA': 4191, 'ar-DZ': 5121, 'zh-MO': 5124, 'de-LI': 5127, 'en-NZ': 5129, 'es-CR': 5130, 'fr-LU': 5132, 'bs-Latn-BA': 5146, 'smj-SE': 5179, 'ar-MA': 6145, 'en-IE': 6153, 'es-PA': 6154, 'fr-MC': 6156, 'sr-Latn-BA': 6170, 'sma-NO': 6203, 'ar-TN': 7169, 'en-ZA': 7177, 'es-DO': 7178, 'sr-Cyrl-BA': 7194, 'sma-SE': 7227, 'ar-OM': 8193, 'en-JM': 8201, 'es-VE': 8202, 'bs-Cyrl-BA': 8218, 'sms-FI': 8251, 'ar-YE': 9217, 'en-029': 9225, 'es-CO': 9226, 'sr-Latn-RS': 9242, 'smn-FI': 9275, 'ar-SY': 10241, 'en-BZ': 10249, 'es-PE': 10250, 'sr-Cyrl-RS': 10266, 'ar-JO': 11265, 'en-TT': 11273, 'es-AR': 11274, 'sr-Latn-ME': 11290, 'ar-LB': 12289, 'en-ZW': 12297, 'es-EC': 12298, 'sr-Cyrl-ME': 12314, 'ar-KW': 13313, 'en-PH': 13321, 'es-CL': 13322, 'ar-AE': 14337, 'es-UY': 14346, 'ar-BH': 15361, 'es-PY': 15370, 'ar-QA': 16385, 'en-IN': 16393, 'es-BO': 16394, 'en-MY': 17417, 'es-SV': 17418, 'en-SG': 18441, 'es-HN': 18442, 'es-NI': 19466, 'es-PR': 20490, 'es-US': 21514
    };

    /**
    * Checks whether the language identifier is a cjk (Chinese, Japanese
    * or Korean) language. Returns true if the languageIdentifier satisfies
    * the expected culture name of the cjk cultures.
    * Cjk codes are based on the .Net CultureInfo and the current browser language codes.
    *
    * @param languageIdentifier for the the language to investigate.
    * @return true if cjk language, false otherwise.
    */
    function isCjkLanguage(languageIdetifier) {
        if (languageIdetifier) {
            var li = languageIdetifier.toLowerCase();
            if (li.indexOf("zh") !== -1 || li.indexOf("ja") !== -1 || (li.indexOf("ko") !== -1 && li !== "kok-in")) {
                return true;
            }
        }
        return false;
    }
    exports.isCjkLanguage = isCjkLanguage;

    /**
    * Convert an lagnguageCode (en-US) to lcid code
    *
    * @param languageCode for the the language to investigate.
    * @return lcid code for the language.
    */
    function getLcid(languageCode) {
        if (languageCode) {
            var lcid = this.cultures[languageCode];
            if (!lcid) {
                for (var prop in this.cultures) {
                    if (prop.toLowerCase().indexOf(languageCode.toLowerCase()) !== -1) {
                        return this.cultures[prop];
                    }
                }
            }
        }
        return lcid;
    }
    exports.getLcid = getLcid;
});

//
// Module: eventlogging
//

define.names.push("eventlogging");
define(["require", "exports", "msg"], function(require, exports, msg) {
    /**
    * Represents generic log event types.
    */
    var LogEventTypes = (function () {
        function LogEventTypes() {
        }
        LogEventTypes.ERROR = "error";
        return LogEventTypes;
    })();
    exports.LogEventTypes = LogEventTypes;

    /**
    * Plugins use this class to generate a log object to be logged by any kind
    * of logger.
    */
    var LogEvent = (function () {
        /**
        * Initializes a new log event of the specified type and log data.
        *
        * @param TypeName The type of log event.
        * @param JsonData The data to log.
        * @param EncodedData Encoded data to log.
        */
        function LogEvent(TypeName, JsonData, EncodedData, CustomFields) {
            if (typeof JsonData === "undefined") { JsonData = {}; }
            if (typeof EncodedData === "undefined") { EncodedData = ""; }
            if (typeof CustomFields === "undefined") { CustomFields = {}; }
            this.TypeName = TypeName;
            this.JsonData = JsonData;
            this.EncodedData = EncodedData;
            this.CustomFields = CustomFields;
            this._timestamp = new Date().valueOf();
        }
        LogEvent.prototype.getTime = function () {
            return this._timestamp;
        };

        /**
        * Creates a new log event, wrapped within a message, that can be sent on
        * the plugin service message hub.
        *
        * @param sender The plugin that will send the message.
        * @param typeName The type of log event.
        * @param jsonData The data to log.
        * @param encodedData Encoded data to log.
        */
        LogEvent.createLogMessage = function (sender, typeName, jsonData, encodedData, customFields) {
            return new msg.Message("LogEvent", sender, new LogEvent(typeName, jsonData, encodedData, customFields));
        };
        return LogEvent;
    })();
    exports.LogEvent = LogEvent;

    /**
    * SLAPI spesific log message.
    */
    var QueryBoxSLAPILogMessage = (function () {
        function QueryBoxSLAPILogMessage(EncodedData, JsonData, SessionId, SessionTime, TypeName, QueryId, ServerElapsedMillis) {
            this.EncodedData = EncodedData;
            this.JsonData = JsonData;
            this.SessionId = SessionId;
            this.SessionTime = SessionTime;
            this.TypeName = TypeName;
            this.QueryId = QueryId;
            this.ServerElapsedMillis = ServerElapsedMillis;
        }
        return QueryBoxSLAPILogMessage;
    })();
    exports.QueryBoxSLAPILogMessage = QueryBoxSLAPILogMessage;

    /**
    * Record click log message.
    */
    var RecordClickLogMessage = (function () {
        function RecordClickLogMessage(pageinfo, clicktype, blocktype, clickedresultid, subresultindex) {
            this.pageinfo = pageinfo;
            this.clicktype = clicktype;
            this.blocktype = blocktype;
            this.clickedresultid = clickedresultid;
            this.subresultindex = subresultindex;
        }
        return RecordClickLogMessage;
    })();
    exports.RecordClickLogMessage = RecordClickLogMessage;
});

//
// Module: myproperties
//

define.names.push("myproperties");
/// <reference path="misc.d.ts" />
define(["require", "exports", "../ext/msfuncy-0.9", "culture", "../ext/rx", "../ext/rx.time", "msg", "utils", "sputils", "eventlogging"], function(require, exports, _, culture, rx, rxt, msg, utils, sputils, logging) {
    (function (Errors) {
        /**
        * The request to fetch my SharePoint properties timed out.
        */
        Errors[Errors["PROPS_TIMED_OUT"] = 3] = "PROPS_TIMED_OUT";
    })(exports.Errors || (exports.Errors = {}));
    var Errors = exports.Errors;

    /**
    *  Properties for the current user.
    */
    var MyProperties = (function () {
        function MyProperties(myGUID, preferredName, personalSpace, personalServer, workEmail, searchLanguage) {
            this.myGUID = myGUID;
            this.preferredName = preferredName;
            this.personalSpace = personalSpace;
            this.personalServer = personalServer;
            this.workEmail = workEmail;
            this.searchLanguage = searchLanguage;
            this.personalServer = personalServer || (window.location.protocol + "//" + window.location.host);
            this.isCjkLanguage = culture.isCjkLanguage(searchLanguage);
            this.languageLcid = culture.getLcid(searchLanguage);
        }
        return MyProperties;
    })();
    exports.MyProperties = MyProperties;

    /**
    * Represents a plugin that will query for the user's User Profile
    * Properties. The query will only be issued once on initialize and the
    * interesting properties will be distributed to other plugins through the
    * message service on the plugin service. If the request times out, one
    * retry attempt is made.
    */
    var MyPropertiesPlugin = (function () {
        function MyPropertiesPlugin() {
            this._myPropertiesURL = "/_api/SP.UserProfiles.PeopleManager/GetMyProperties?$select=UserProfileProperties";
            this._timeout = 10000;
        }
        /**
        * Gets the id of the plugin
        */
        MyPropertiesPlugin.prototype.getId = function () {
            return "mypropertiesplugin";
        };

        /**
        * Initializes the plugin to make a ajax request for the users profile
        * data, parses them and sends a message with the data of interest to
        * the other plugins.
        *
        * @param pluginService The pluginSevice that holds the message services
        * used to distribute the profile data.
        */
        MyPropertiesPlugin.prototype.initialize = function (pluginService) {
            var that = this, messageHub = pluginService.message(), i = 0;

            // If properties are in the sessionStorage, publish and return
            var sessionStorageId = "ms-oil-" + that.getId();
            var resultsCache = utils.loadFromSessionStorage(sessionStorageId);

            if (resultsCache) {
                messageHub.onNext(new msg.Message(MyPropertiesPlugin.myPropertiesMessageType, that, resultsCache));
                return;
            }

            // Get Properties for current user.
            rxt.Observable.defer(function () {
                return rx.Observable.ajax({
                    url: that._myPropertiesURL,
                    method: 'GET',
                    headers: { 'ACCEPT': 'application/json;odata=verbose' },
                    async: true
                });
            }).timeout(that._timeout, rx.Observable.throwException(_.createError(3 /* PROPS_TIMED_OUT */, "The request to fetch my " + "SharePoint properties timed out.")), that._scheduler).retry(2).select(that._parseGetMyProperties).where(function (parsedData) {
                return !!parsedData;
            }).subscribe(function (data) {
                utils.saveToSessionStorage(sessionStorageId, data);
                messageHub.onNext(new msg.Message(MyPropertiesPlugin.myPropertiesMessageType, that, data));

                var logEvent = new logging.LogEvent("UserInformation", { language: data.searchLanguage }, "");
                messageHub.onNext(new msg.Message("LogEvent", that, logEvent));
            }, _.handleOrRethrow(function (e) {
                return e.number === 3 /* PROPS_TIMED_OUT */;
            }, function (e) {
                return messageHub.onNext(logging.LogEvent.createLogMessage(that, logging.LogEventTypes.ERROR, { number: e.number, message: e.message }));
            }));
        };

        /**
        * Parse the result from MyProperties.
        *
        * @param data  The result of the MyProperties call from the server
        * @return An object containing my properties
        */
        MyPropertiesPlugin.prototype._parseGetMyProperties = function (data) {
            if (data && data.status !== 200) {
                return null;
            }
            var parsedData = JSON.parse(data.responseText);
            if (parsedData && parsedData.d && parsedData.d.UserProfileProperties && parsedData.d.UserProfileProperties.results) {
                var myPropertiesResults = parsedData.d.UserProfileProperties.results;
                var myProperties = sputils.keyValuesToObject(myPropertiesResults);
                var serverUrl = utils.getServerUrl(myProperties.PictureURL);
                var searchLanguage = sputils.getMySearchLanguage(myProperties["SPS-ContentLanguages"]);
                return new MyProperties(myProperties.UserProfile_GUID, myProperties.PreferredName, myProperties.PersonalSpace, serverUrl, myProperties.WorkEmail, searchLanguage);
            }
            return null;
        };
        MyPropertiesPlugin.myPropertiesMessageType = "MyUserProfileData";
        return MyPropertiesPlugin;
    })();
    exports.MyPropertiesPlugin = MyPropertiesPlugin;
});

//
// Module: signal
//

define.names.push("signal");
define(["require", "exports", "../ext/rx.html", "registry", "sputils"], function(require, exports, rxh, reg, sputils) {
    var SignalPlugin = (function () {
        function SignalPlugin() {
        }
        SignalPlugin.prototype.getId = function () {
            return "signal";
        };

        SignalPlugin.prototype.initialize = function (ps) {
            sputils.RequestDigest.initializeDigestSequence();

            // Here we set up an Rx pipeline. Note that that pipeline is not
            // "triggered". We have no subscribers, but we make sure that
            // subscribers get a ready made headers object.
            var headersSeq = sputils.RequestDigest.getDigestSequence().where(function (data) {
                return !!data;
            }).take(1).select(function (digest) {
                return {
                    'ACCEPT': 'application/json;odata=verbose',
                    'Content-Type': 'application/json;odata=verbose',
                    'X-RequestDigest': digest
                };
            });

            /* Sends the feedconsumed signal for all graph queries which are querying "My Pulse" tag */
            ps.query().where(function (ql) {
                return ql.getQuery().getProperties()[reg.queryProperties.tag] === reg.Tags.myPulse;
            }).subscribe(function (ql) {
                ql.progress().where(function (sp) {
                    return sp.getSource().getId() === "graph";
                }).combineLatest(ql.progress().where(function (sp) {
                    return sp.getSource().getId() === "actor" && sp.getData() === "me";
                }), function (sp1, sp2) {
                    return sp1;
                }).take(1).subscribe(function (sp) {
                    // We need to make sure that we do not do any AJAX
                    // requests before we have the digest header
                    // available. Here we subscribe to the header
                    // sequence.
                    headersSeq.subscribe(function (reqHeaders) {
                        rxh.Observable.ajax({
                            url: SignalPlugin.signalStoreUrl,
                            method: "POST",
                            async: true,
                            headers: reqHeaders,
                            body: JSON.stringify({
                                "signals": [
                                    {
                                        "Actor": {
                                            "Id": null
                                        },
                                        "Action": {
                                            "ActionType": "ForFeedConsumed",
                                            "UserTime": Date.prototype.toISOString ? new Date().toISOString() : "",
                                            "Properties": {
                                                "results": [{
                                                        "__metadata": {
                                                            "type": "SP.KeyValue"
                                                        },
                                                        "Key": "LastPositionSeen",
                                                        "Value": "0",
                                                        "ValueType": "Edm.String"
                                                    }]
                                            }
                                        },
                                        "Item": {
                                            "Id": "null"
                                        },
                                        "Source": "PulseWeb"
                                    }
                                ]
                            })
                        }).subscribe(function (xhr) {
                            /* TODO: handle errors, maybe log to logger plugin if one is registered? *
                            * When integration plugin is created, this error can be propagated to Pulse Web and be logged from there */
                        });
                    });
                });
            });
        };
        SignalPlugin.signalStoreUrl = "/_api/signalstore/signals";
        return SignalPlugin;
    })();

    
    return SignalPlugin;
});

//
// Module: ../ext/queryrules
//

define.names.push("../ext/queryrules");
/// <reference path="../scripts/msload-1.0.js" />
/// <reference path="tag.ts" />

define(function () {

    function bindQueryRulesModule(mod) {
        // A list of all query rules that will be used for matching against user input
        var queryRules = [];

        /**
         * Creates a deep copy of an object.
         *
         * @param obj The object to copy.
         * @return A copy of the object.
         */
        function cloneObject(obj) {
            return JSON.parse(JSON.stringify(obj));
        }

        /**
         * Creates a new rule by combining (joining) two rules.
         *
         * @param rule1 The first rule.
         * @param rule2 The second rule.
         * @return A new rule that is the combination of rule1 and rule2.
         */
        function combineRule(rule1, rule2) {
            var rule = cloneObject(rule1);

            if (rule2.querySuggestion) {
                var space = " ";
                if (!rule.querySuggestion) {
                    rule.querySuggestion = "";
                    space = "";
                }
                rule.querySuggestion += space + rule2.querySuggestion;
            }

            if (rule2.trigger) {

                if (!rule.trigger) {
                    rule.trigger = {};
                }

                // Copy entities
                if (rule2.trigger.entities) {
                    if (!rule.trigger.entities) {
                        rule.trigger.entities = [];
                    }
                    rule.trigger.entities = rule.trigger.entities.concat(rule2.trigger.entities);
                }

                // Copy guards
                if (rule2.trigger.guards) {
                    if (!rule.trigger.guards) {
                        rule.trigger.guards = [];
                    }
                    rule.trigger.guards = rule.trigger.guards.concat(rule2.trigger.guards);
                }


                // Copy keywords
                if (rule2.trigger.any) {
                    if (!rule.trigger.any) {
                        rule.trigger.any = [];
                    }
                    rule.trigger.any = rule.trigger.any.concat(rule2.trigger.any);
                }
            }

            if (rule2.queryText) {
                var space = " ";
                if (!rule.queryText || rule.queryText == "*") {
                    rule.queryText = "";
                    space = "";
                }
                rule.queryText += space + rule2.queryText;
            }

            if (rule2.graphQuery) {
                // Overwrite
                rule.graphQuery = rule2.graphQuery;
            }

            if (rule2.tagIcon) {
                rule.tagIcon = rule2.tagIcon;
            }

            if (rule2.graphRankingType) {
                rule.graphRankingType = rule2.graphRankingType
            }

            return rule;
        }

        /*
         * Creates a new rule by combining (joining) a variable length of rules.
         *
        * @param <arguments> A variable length of rules to combine.
         * @return A new rule that is the combination of rule1, rule2, ..., ruleN.
         */
        function combineAllRules() {
            var finalRule = {};
            for (var i = 0; i < arguments.length; i++) {
                finalRule = combineRule(finalRule, arguments[i]);
            }
            return finalRule;
        }

        /*
         * Creates a list of rules by combining a base rule with all possible 
         * combinations (on/off) of a list of filter rules.
         *
         * @example
         * (base, [rule1, rule2]) returns [base, base-rule1-rule2, base-rule1, base-rule2]
         *
         * @param baseRule The rule to combine with the filter rules.
         * @param filterRules A list of rules to combine with the base rule.
         * @return A list of rules.
         */
        function getAllCombinationRules(baseRule, filterRules) {
            /*
            00000
            00001
            00010
            00011
            00100
            00101
            */
            var rules = [];
            for (var i = 0; i < Math.pow(2, filterRules.length) ; i++) {
                var rule = baseRule;
                //for (var j = filterRules.length - 1; j >= 0; j--) {
                for (var j = 0; j < filterRules.length; j++) {
                    if ((i >> j) & 0x1) {
                        rule = combineRule(rule, filterRules[j]);
                    }
                }
                rules.push(rule);
            }
            return rules;
        }

        /* Core filter rules */

        var aboutSubRule = {
            querySuggestion: "about {userterms0.Terms}",
            trigger: {
                entities: ["userterms0"],
                any: ["about"]
            },
            queryText: "{userterms0.Terms}",
            graphQuery: ""
        };

        /*
    var dateSubRule = {
    querySuggestion: "from {date0.Name}",
    trigger: {
    entities: ["date0"]
    },
    queryText: "LastModifiedTime>={date0.DateString}",
    graphQuery: ""
    };
    
    var siteSubRule = {
    querySuggestion: "at {site0.Name}",
    trigger: {
    entities: ["site0"]
    },
    queryText: "path:\"{site0.Uri}\"",
    graphQuery: ""
    };
        */

        /* People <me> rules */
        //var peopleCloseToMeRule = {
        //    querySuggestion: "People close to {me.MeString}",
        //    trigger: {
        //        any: ["people", "close", "near", "me"]
        //    },
        //    queryText: "*",
        //    graphQuery: "actor({me.DocId}\\,action\\:1019)"
        //};

        //var peopleWorkingWithMeRule = {
        //    querySuggestion: "People working with {me.MeString}",
        //    trigger: {
        //        any: ["people", "work", "working", "me"]
        //    },
        //    queryText: "*",
        //    graphQuery: "actor({me.DocId}\\,action\\:1033)"
        //};

        //var peopleManagedByMeRule = {
        //    querySuggestion: "People managed by {me.MeString}",
        //    trigger: {
        //        any: ["people", "managed", "me"]
        //    },
        //    queryText: "*",
        //    graphQuery: "actor({me.DocId}\\,action\\:1014)"
        //};

        //var peopleManagingMeRule = {
        //    querySuggestion: "People managing {me.MeString}",
        //    trigger: {
        //        any: ["people", "manager", "managing", "me"]
        //    },
        //    queryText: "*",
        //    graphQuery: "actor({me.DocId}\\,action\\:1013)"
        //};

        //var peopleColleaguesMeRule = {
        //    querySuggestion: "People who are colleagues of {me.MeString}",
        //    trigger: {
        //        any: ["people", "colleagues", "me"]
        //    },
        //    queryText: "*",
        //    graphQuery: "actor({me.DocId}\\,action\\:1015)"
        //};

        /* People <x> rules */
        //var peopleWorkingWithPersonRule = {
        //    querySuggestion: "People working with {person0.PreferredName}",
        //    trigger: {
        //        entities: ["person0"],
        //        any: ["people", "work", "working"]
        //    },
        //    queryText: "*",
        //    graphQuery: "actor({person0.DocId}\\,action\\:1033)"
        //};

        //var peopleManagedByPersonRule = {
        //    querySuggestion: "People managed by {person0.PreferredName}",
        //    trigger: {
        //        entities: ["person0"],
        //        any: ["people", "managed"]
        //    },
        //    queryText: "*",
        //    graphQuery: "actor({person0.DocId}\\,action\\:1014)"
        //};

        //var peopleManagingPersonRule = {
        //    querySuggestion: "People managing {person0.PreferredName}",
        //    trigger: {
        //        entities: ["person0"],
        //        any: ["people", "manager", "managing"]
        //    },
        //    queryText: "*",
        //    graphQuery: "actor({person0.DocId}\\,action\\:1013)"
        //};

        //var peopleColleaguesPersonRule = {
        //    querySuggestion: "People who are colleagues of {person0.PreferredName}",
        //    trigger: {
        //        entities: ["person0"],
        //        any: ["people", "colleagues"]
        //    },
        //    queryText: "*",
        //    graphQuery: "actor({person0.DocId}\\,action\\:1015)"
        //};

        /* Documents <me> rules */

        var documentsModifiedByMeRule = {
            querySuggestion: "Modified by {me.MeString}",
            trigger: {
                any: ["documents", "docs", "modified", "changed", "me"]
            },
            queryText: "*",
            graphQuery: "actor({me.DocId}\\,action\\:1003)",
            tagIcon: 2
        };

        queryRules = queryRules.concat(getAllCombinationRules(documentsModifiedByMeRule, [aboutSubRule]));


        var documentsPopularWithMeRule = {
            querySuggestion: "Trending around {me.MeString}",
            trigger: {
                any: ["documents", "docs", "trending", "me"]
            },
            queryText: "*",
            graphQuery: "actor({me.DocId}\\,action\\:1020)",
            tagIcon: 6,
            graphRankingType: "weight"
        };

        queryRules = queryRules.concat(getAllCombinationRules(documentsPopularWithMeRule, [aboutSubRule]));

        var documentsViewedByMeRule = {
            querySuggestion: "Viewed by {me.MeString}",
            trigger: {
                any: ["documents", "docs", "viewed", "read", "me"]
            },
            queryText: "*",
            graphQuery: "actor({me.DocId}\\,action\\:1001)",
            tagIcon: 4,
            graphRankingType: "time"
        };

        queryRules = queryRules.concat(getAllCombinationRules(documentsViewedByMeRule, [aboutSubRule]));

        var documentsPresentedToMeRule = {
            querySuggestion: "Presented to {me.MeString}",
            trigger: {
                any: ["documents", "docs", "presented", "me"]
            },
            queryText: "*",
            graphQuery: "actor({me.DocId}\\,action\\:1024)",
            tagIcon: 5,
            graphRankingType: "time"
        };

        queryRules = queryRules.concat(getAllCombinationRules(documentsPresentedToMeRule, [aboutSubRule]));

        var documentsLikedByMeRule = {
            querySuggestion: "Liked by {me.MeString}",
            trigger: {
                any: ["documents", "liked", "like", "me"]
            },
            queryText: "*",
            graphQuery: "actor({me.DocId}\\,action\\:1005)",
            tagIcon: 7
        };

        queryRules = queryRules.concat(getAllCombinationRules(documentsLikedByMeRule, [aboutSubRule]));

        var myPulseRule = {
            querySuggestion: "My Pulse",
            trigger: {
                any: ["my", "pulse"]
            },
            queryText: "*",
            graphQuery: "and(actor(me\\,action\\:1021)\\,actor(me\\,or(action\\:1021\\,action\\:1003\\,action\\:1001\\,action\\:1020\\,action\\:1024\\,action\\:1005\\,action\\:1037\\,action\\:1039\\,action\\:1036\\,action\\:1043)))",
            tagIcon: 1,
            graphRankingType: "weight"
        };

        //var documentsInFeedRule = {
        //    querySuggestion: "Documents recommended for me now",
        //    trigger: {
        //        any: ["documents", "docs", "recommended", "now", "me"]
        //    },
        //    queryText: "*",
        //    graphQuery: "actor({me.DocId}\\,action\\:1021)"
        //};

        /* Documents <x> rules */

        var documentsModifiedByPersonRule = {
            querySuggestion: "Modified by {person0.PreferredName}",
            trigger: {
                entities: ["person0"],
                any: ["documents", "docs", "modified", "changed"]
            },
            queryText: "*",
            graphQuery: "actor({person0.DocId}\\,action\\:1003)",
            tagIcon: 2
        };

        queryRules = queryRules.concat(getAllCombinationRules(documentsModifiedByPersonRule, [aboutSubRule]));

        var documentsPopularWithPersonRule = {
            querySuggestion: "Trending around {person0.PreferredName}",
            trigger: {
                entities: ["person0"],
                any: ["documents", "docs", "trending"]
            },
            queryText: "*",
            graphQuery: "actor({person0.DocId}\\,action\\:1020)",
            tagIcon: 6,
            graphRankingType: "weight"
        };

        queryRules = queryRules.concat(getAllCombinationRules(documentsPopularWithPersonRule, [aboutSubRule]));

        /* Documents <x> or <y> rules */

        var documentsModifiedByPersonOrPersonRule = {
            querySuggestion: "Modified by {person0.PreferredName} or {person1.PreferredName}",
            trigger: {
                entities: ["person0", "person1"],
                any: ["documents", "docs", "modified", "changed"]
            },
            queryText: "*",
            graphQuery: "or(actor({person0.DocId}\\,action\\:1003)\\,actor({person1.DocId}\\,action\\:1003))",
            tagIcon: 2
        };

        queryRules = queryRules.concat(getAllCombinationRules(documentsModifiedByPersonOrPersonRule, [aboutSubRule]));

        var documentsPopularWithPersonOrPersonRule = {
            querySuggestion: "Trending around {person0.PreferredName} or {person1.PreferredName}",
            trigger: {
                entities: ["person0", "person1"],
                any: ["documents", "docs", "trending"]
            },
            queryText: "*",
            graphQuery: "or(actor({person0.DocId}\\,action\\:1020)\\,actor({person1.DocId}\\,action\\:1020))",
            tagIcon: 6,
            graphRankingType: "weight"
        };

        queryRules = queryRules.concat(getAllCombinationRules(documentsPopularWithPersonOrPersonRule, [aboutSubRule]));

        var presentedToMeAndEditedByPerson = {
            querySuggestion: "Presented to {me.MeString} and modified by {person0.PreferredName}",
            trigger: {
                entities: ["person0"],
                any: ["presented, modified"]
            },
            queryText: "*",
            graphQuery: "and(actor({me.DocId}\\,action\\:1024)\\,actor({person0.DocId}\\,action\\:1003))",
            tagIcon: 5,
            graphRankingType: "time"
        };

        queryRules = queryRules.concat(getAllCombinationRules(presentedToMeAndEditedByPerson, [aboutSubRule]));

        //var presentedToMeAndEditedByPersonAbout = combineAllRules(presentedToMeAndEditedByPerson, aboutSubRule);

        /* Site rules */

        var everythingOnSiteRule = {
            querySuggestion: "Everything at {site0.Name}",
            trigger: {
                entities: ["site0"]
            },
            queryText: "path:\"{site0.Uri}\""
        };

        var everythingOnSiteAboutRule = {
            querySuggestion: "Everything at {site0.Name} about {userterms0.Terms}",
            trigger: {
                entities: ["site0", "userterms0"]
            },
            queryText: "{userterms0.Terms} path:\"{site0.Uri}\""
        };

        var everythingOnSiteOrSiteAboutRule = {
            querySuggestion: "Everything at {site0.Name} or {site1.Name} about {userterms0.Terms}",
            trigger: {
                entities: ["site0", "site1", "userterms0"]
            },
            queryText: "{userterms0.Terms} path:\"{site0.Uri}\" path:\"{site1.Uri}\""
        };

        //var sitesPopularInOrgRule = {
        //    querySuggestion: "Sites popular in my company",
        //    trigger: {
        //        any: ["sites", "popular", "company", "organization"]
        //    },
        //    queryText: "FollowRecommendedFor:00000000-0000-0000-0000-000000000000"
        //}

        //var sitesRecommendedForMe = {
        //    querySuggestion: "Sites recommended for {me.MeString}",
        //    trigger: {
        //        any: ["sites", "me", "recommended"]
        //    },
        //    queryText: "FollowRecommendedFor:{me.UserProfile_GUID}"
        //}

        //var sitesRecommendedForPerson = {
        //    querySuggestion: "Sites recommended for {person0.PreferredName}",
        //    trigger: {
        //        entities: ["person0"],
        //        any: ["sites", "recommended"]
        //    },
        //    queryText: "FollowRecommendedFor:{person0.UserProfile_GUID}"
        //}

        /* Shared with rules */

        var sharedWithMeRule = {
            querySuggestion: "Shared with {me.MeString}",
            trigger: {
                any: ["shared", "me"]
            },
            queryText: "SharedWithUsersOWSUSER:\"{me.WorkEmail}\"",
            tagIcon: 8
        };

        var sharedWithMeAboutRule = combineAllRules(sharedWithMeRule, aboutSubRule);
        //var sharedWithMeSiteRule = combineAllRules(sharedWithMeRule, siteSubRule);
        //var sharedWithMeSiteAboutRule = combineAllRules(sharedWithMeRule, siteSubRule, aboutSubRule);

        var sharedWithPersonRule = {
            querySuggestion: "Shared with {person0.PreferredName}",
            trigger: {
                entities: ["person0"],
                any: ["shared"]
            },
            queryText: "SharedWithUsersOWSUSER:\"{person0.WorkEmail}\"",
            tagIcon: 8
        };

        var sharedWithPersonAboutRule = combineAllRules(sharedWithPersonRule, aboutSubRule);
        //var sharedWithPersonSiteRule = combineAllRules(sharedWithPersonRule, siteSubRule);
        //var sharedWithPersonSiteAboutRule = combineAllRules(sharedWithPersonRule, siteSubRule, aboutSubRule);


        queryRules = queryRules.concat([

            //peopleCloseToMeRule,
            //peopleWorkingWithMeRule,
            //peopleManagedByMeRule,
            //peopleManagingMeRule,
            //peopleColleaguesMeRule,

            //peopleWorkingWithPersonRule,
            //peopleManagedByPersonRule,
            //peopleManagingPersonRule,
            //peopleColleaguesPersonRule,

            //documentsViewedByMeRule,
            //documentsPresentedToMeRule,
            //documentsInFeedRule,

            //everythingOnSiteRule,
            //everythingOnSiteAboutRule,
            //everythingOnSiteOrSiteAboutRule,

            //sitesPopularInOrgRule,
            //sitesRecommendedForMe,
            //sitesRecommendedForPerson,

            sharedWithMeRule,
            //sharedWithMeSiteAboutRule,
            //sharedWithMeSiteRule,
            sharedWithMeAboutRule,

            sharedWithPersonRule,
            //sharedWithPersonSiteAboutRule,
            //sharedWithPersonSiteRule,
            sharedWithPersonAboutRule,

        ]);

        //console.log("Using", queryRules.length, "query rules");

        // A list of rules to show when the user input is empty.
        var zeroTermQueryRules = [

            myPulseRule,
            documentsPresentedToMeRule,
            sharedWithMeRule,
            documentsModifiedByMeRule,
            documentsPopularWithMeRule,
            documentsLikedByMeRule,
            documentsViewedByMeRule,

            //peopleCloseToMeRule,
            //peopleWorkingWithMeRule,
            //peopleColleaguesMeRule,
        ]

        // A list of terms used in the query rules. Used for filtering away common terms
        // to avoid suggestions like "about viewed" and "about documents".
        var allQueryRuleTerms = {};
        for (var i = 0; i < queryRules.length; i++) {
            var terms = getQueryTerms(queryRules[i].querySuggestion);
            if (queryRules[i].trigger && queryRules[i].trigger.any) {
                terms = terms.concat(queryRules[i].trigger.any);
            }
            for (var j = 0; j < terms.length; j++) {
                allQueryRuleTerms[terms[j]] = 1;
            }
        }

        /*
         * Formats a string by replacing {key} and {key1.key2} entries from an object.
         *
         * @param str The string to format.
         * @param dict The object to lookup {key} entries from.
         * @param preMarkup An optional string to prefix the matched {key} entries with.
         * @param postMarkup An optional string to append the matched {key} entries with.
         * @return The formatted string.
         */
        function stringFormat(str, dict, preMarkup, postMarkup) {
            return str.replace(
    /\{([\w\.\d]+)\}/g,
    function (_, index) {
        var indexes = index.split(".");
        var res = "";
        preMarkup = preMarkup || "";
        postMarkup = postMarkup || "";
        if (indexes.length == 1) {
            res = dict[indexes[0]];
        }
        else if (indexes.length >= 2) {
            res = dict[indexes[0]][indexes[1]];
        }
        return preMarkup + res + postMarkup;
    });
        }

        /*
         * Splits a string into terms based on whitespace.
         *
         * @param queryString The string to split.
        * @return A list of terms.
         */
        function getQueryTerms(queryString) {
            var queryTerms = queryString.toLowerCase().split(/\s+/);
            queryTerms = queryTerms.map(function f(term) { return term.trim(); });
            queryTerms = queryTerms.filter(function f(term) { return term.length > 0 });
            return queryTerms;
        }

        /*
         * Computes the rank of a query rule from a query object representing the user input.
         *
         * @param queryRule The query rule to rank.
         * @param queryObj The query object representing user input.
         * @return A whole number where a higher number indicates higher rank. Zero means completely irrelevant.
         */
        function getQueryRuleRank(queryRule, queryObj) {

            var rank = 0;

            if (!queryRule.trigger) {
                return 0;
            }

            // Match entities
            var detectedEntityNames = Object.keys(queryObj.entities).slice(0).sort();
            var meIndex = detectedEntityNames.indexOf("me");
            if (meIndex >= 0) {
                detectedEntityNames.splice(meIndex, 1);
            }
            var queryRuleEntities = [];
            if (queryRule.trigger && queryRule.trigger.entities) {
                queryRuleEntities = queryRule.trigger.entities.slice(0).sort();
            }

            if (detectedEntityNames.length != queryRuleEntities.length) {
                return 0;
            }

            for (var i = 0; i < detectedEntityNames.length; i++) {
                if (detectedEntityNames[i] != queryRuleEntities[i]) {
                    return 0;
                }
                rank++;
            }

            // Match simple keywords
            if (queryRule.trigger.any) {

                var queryTerms = queryObj.queryTerms;

                for (var i = 0; i < queryRule.trigger.any.length; i++) {

                    var triggerTerm = queryRule.trigger.any[i];

                    for (var j = 0; j < queryTerms.length; j++) {
                        var queryTerm = queryTerms[j];
                        //console.log([triggerTerm, queryTerm]);
                        // Allow prefix match on last word
                        if (j == queryTerms.length - 1) {
                            if (triggerTerm.indexOf(queryTerm) == 0) {
                                rank++;
                            }
                        }
                        else if (triggerTerm == queryTerm) {
                            rank++;
                        }
                    }

                }
                return rank;
            }

            return rank;
        }

        /*
         * Resolves (finds) person entities from query terms.
         *
         * @param queryTerms The terms to look for person entities in.
         * @param personEntities A list of person entities to match against.
         * @param symbolicEntities The dictionary to add detected entities to.
         * @return A modified queryTerms list where matching terms have been replaced with {personX}.
         */
        function resolvePersonEntities(queryTerms, personEntities, symbolicEntities) {
            /*
            var people = [
                { PreferredName: "Kris Mikalsen" },
                { PreferredName: "Kris Josefson" },
                { PreferredName: "Kristoffer Jakobsen"},
                { PreferredName: "Troels Waldsted Hansen"},
                { PreferredName: "SystemAccount"},
            ];
            */

            return resolveEntities(queryTerms, personEntities, "PreferredName", "person", symbolicEntities);
        }

        /*
         * Resolves (finds) site entities from query terms.
         *
         * @param queryTerms The terms to look for site entities in.
         * @param siteEntities A list of site entities to match against.
         * @param symbolicEntities The dictionary to add detected entities to.
         * @return A modified queryTerms list where matching terms have been replaced with {siteX}.
         */
        function resolveSiteEntities(queryTerms, siteEntities, symbolicEntities) {
            /*
            var sites = [
                { Name: "Big Data" },
                { Name: "O365 Insights"},
                { Name: "FAST"}
            ];
            */

            return resolveEntities(queryTerms, siteEntities, "Name", "site", symbolicEntities);
        }

        /*
         * Resolves (finds) "about x" from query terms.
         *
         * @param queryTerms The terms to look for "about x".
         * @param symbolicEntities The dictionary to add detected entities to.
         * @return A modified queryTerms list where matching terms have been replaced with {usertermsX}.
         */
        function resolvePreUserTermEntities(queryTerms, symbolicEntities) {

            var userTerms = [];

            // Create a copy of the terms
            queryTerms = queryTerms.slice();

            // Alt: everything after 'about' are user terms
            // Alt: everything in quotes are user terms
            // Currently: First term after 'about'
            for (var x = 1; x < queryTerms.length; x++) {
                if (queryTerms[x - 1] == "about") {
                    userTerms.push(queryTerms[x]);
                    queryTerms[x] = "{userterms0}";
                }
            }

            if (userTerms.length > 0) {
                symbolicEntities["userterms0"] = { Terms: userTerms.join(" ") };
            }

            return queryTerms;
        }

        /*
         * Resolves (finds) terms that are not used in query rules (e.g. documents, people, modified).
         *
         * This must be run after all other entity resolvers to avoid 'stealing' person, site and date entities.
         *
         * @param queryTerms The terms to look up.
         * @param symbolicEntities The dictionary to add detected entities to.
         * @return The queryTerms list unmodified.
         */
        function resolvePostUserTermEntities(queryTerms, symbolicEntities) {

            var userTerms = [];

            for (var x = 0; x < queryTerms.length; x++) {
                var term = queryTerms[x];
                if (term.length > 1 && term[0] != "{") {
                    // Avoid classifying prefixes of tag terms as user terms
                    if (x == queryTerms.length - 1) {
                        var reservedTerms = Object.keys(allQueryRuleTerms);
                        var matchesReservedTerm = false;
                        for (var y = 0; y < reservedTerms.length; y++) {
                            if (reservedTerms[y].indexOf(term) == 0) {
                                matchesReservedTerm = true;
                                break;
                            }
                        }
                        if (!matchesReservedTerm) {
                            userTerms.push(term);
                        }
                    }
                    else if (allQueryRuleTerms[term] != 1) {
                        userTerms.push(term);
                    }
                    // Can't remember why we don't replace the term with {userterms0}.
                    // Remember to create a copy of queryTerms if uncommenting.
                    // queryTerms[x] = "{userterms0}";
                }
            }

            if (userTerms.length > 0) {
                var space = " ";
                if (!symbolicEntities["userterms0"]) {
                    symbolicEntities["userterms0"] = { Terms: "" };
                    space = "";
                }
                symbolicEntities["userterms0"].Terms += space + userTerms.join(" ");
            }

            return queryTerms;
        }

        /*
         * Resolves (finds) date entities from query terms.
         *
         * @param queryTerms The terms to look for date entities in.
         * @param symbolicEntities The dictionary to add detected entities to.
         * @return A modified queryTerms list where matching terms have been replaced with {dateX}.
         */
        function resolveDateEntities(queryTerms, symbolicEntities) {
            var dates = [
               { Name: "today", DateString: getDateFromOffsetDays(0) },
               { Name: "yesterday", DateString: getDateFromOffsetDays(1) },
               { Name: "past week", DateString: getDateFromOffsetDays(7) },
               { Name: "past month", DateString: getDateFromOffsetDays(30) },
               { Name: "past year", DateString: getDateFromOffsetDays(365) },
            ];

            return resolveEntities(queryTerms, dates, "Name", "date", symbolicEntities);
        }

        /*
         * Creates a string of the date X number of days ago.
         *
         * @example (3) returns "2014-01-16" if the date today is 2014-01-19.
         *
         * @param numDays The number of days to subtract from today.
         * @return A string of the date numDays ago.
         */
        function getDateFromOffsetDays(numDays) {
            var then = new Date();
            var offsetMs = then.getTime() - (1000 * 60 * 60 * 24 * numDays);
            then.setTime(offsetMs);
            return then.toISOString().split("T")[0];
        }

        /*
         * Currently unused. Might consider detecting me (or my name).
         *
        function resolveMeEntities(queryTerms, symbolicEntities) {
        
        }
        */

        /*
         * Resolves (finds) entities in query terms from a list of candidate entities.
         *
         * @param queryTerms The terms to look for entities in.
         * @param candidateEntities The list of candidate entities.
         * @param candidateKeyName The key (property) name on candidate entities to use for matching against the terms.
         * @param symbolicNamePrefix The name to use when adding entries to symbolicEntities.
         * @param symbolicEntities The dictionary to add detected entities to.
         * @return A modified queryTerms list where matching terms have been replaced with {symbolicNamePrefixX}.
         */
        function resolveEntities(queryTerms, candidateEntities, candidateKeyName, symbolicNamePrefix, symbolicEntities) {

            // Consider re-writing this method.

            var allMatches = [];

            for (var i = 0; i < candidateEntities.length; i++) {

                var candidate = candidateEntities[i];
                var candidateTerms = getQueryTerms(candidate[candidateKeyName]);

                //console.log(candidateTerms);

                for (var j = 0; j < queryTerms.length; j++) {

                    if (!allMatches[j]) {
                        allMatches[j] = [];
                    }

                    //console.log("TERM: " + queryTerms[j]);
                    var match = [];

                    for (var k = 0; k < candidateTerms.length; k++) {

                        var queryTerm = queryTerms[j + match.length];
                        var candidateTerm = candidateTerms[k];

                        //console.log(queryTerm, candidateTerm, j, j + match.length, k);

                        // TODO: Boost exact matches, take in account length.

                        if (candidateTerm == queryTerm || (j + match.length == queryTerms.length - 1 && queryTerm && queryTerm != "me" && candidateTerm && queryTerm.length > 1 && candidateTerm.indexOf(queryTerm) == 0)) {
                            match.push([j, k]);
                        } else {
                            if (match.length > 0) {
                                allMatches[j].push({ entityIndex: i, length: match.length, offset: match[0][1] });
                                j += match.length;
                                if (k == candidateTerms.length - 1) {
                                    j--;
                                }
                            }
                            match = [];
                        }
                    }

                    if (match.length > 0) {
                        allMatches[j].push({ entityIndex: i, length: match.length, offset: match[0][1] });
                        j += match.length;
                    }
                }
            }

            var numAssignedSymbolicNames = 0;

            // {0: [], 4: []}
            var newQueryTerms = [];
            var index2symbolicName = {};
            var queryTermOffset = 0;
            for (var x = 0; x < queryTerms.length; x++) {
                //console.log("TERM", x, queryTerms[x]);
                var termMatches = allMatches[x];
                if (termMatches && termMatches.length > 0) {
                    var maxMatchLength = -1;
                    var selectedMatch = null;
                    for (var y = 0; y < termMatches.length; y++) {
                        var match = termMatches[y];
                        if (match.length > maxMatchLength) {
                            maxMatchLength = match.length;
                            selectedMatch = match;
                        } else if (match.length == maxMatchLength && match.offset < selectedMatch.offset) {
                            selectedMatch = match;
                        }
                    }

                    if (selectedMatch) {
                        var symbolicName = index2symbolicName[selectedMatch.entityIndex];
                        if (!symbolicName) {
                            symbolicName = symbolicNamePrefix + numAssignedSymbolicNames;
                            symbolicEntities[symbolicName] = candidateEntities[selectedMatch.entityIndex];
                            index2symbolicName[selectedMatch.entityIndex] = symbolicName;
                            numAssignedSymbolicNames++;
                        }
                        //console.log("selected", selectedMatch, candidateEntities[selectedMatch.entityIndex].PreferredName, maxMatchLength, symbolicName);
                        newQueryTerms.push("{" + symbolicName + "}");
                        x += maxMatchLength - 1;
                    }
                } else {
                    newQueryTerms.push(queryTerms[x]);
                }
            }

            return newQueryTerms;
        }

        /*
         * Creates a query object from raw user input that can be used for matching query rules.
         *
         * @param queryString The string to parse and perform entity extraction on.
         * @param currentUserDoc The search result document of the current user.
         * @param personEntities A list of people entities to use for matching.
         * @param siteEntities A list of site entities to use for matching.
         * @return An object with terms and detected entities.
         */
        function getQueryObject(queryString, currentUserDoc, personEntities, siteEntities) {
            var entities = {};

            // The {me} entity is special and always available.
            entities["me"] = currentUserDoc || {};
            entities["me"].MeString = "me";

            var entityQueryTerms = getQueryTerms(queryString);
            entityQueryTerms = resolvePreUserTermEntities(entityQueryTerms, entities);
            //entityQueryTerms = resolveMeEntities(entityQueryTerms, entities);
            entityQueryTerms = resolvePersonEntities(entityQueryTerms, personEntities, entities);
            entityQueryTerms = resolveSiteEntities(entityQueryTerms, siteEntities, entities);
            //entityQueryTerms = resolveDateEntities(entityQueryTerms, entities);
            entityQueryTerms = resolvePostUserTermEntities(entityQueryTerms, entities);
            return {
                queryString: queryString,
                queryTerms: getQueryTerms(queryString),
                entityQueryString: entityQueryTerms.join(" "),
                entityQueryTerms: entityQueryTerms,
                entities: entities
            };
        }

        function extractActionId(query) {
            //Build correct ranking model expression
            var actionIdFilter = "\\,action\\:";
            var actionIndex = query.indexOf(actionIdFilter);
            var actionId = "";
            if (actionIndex > -1) {
                var substr = query.substring(actionIndex + actionIdFilter.length);
                actionId = substr.substring(0, substr.indexOf(')'));
            }
            return actionId;
        }

        function getRankingModelExpression(graphRankingType, actionId) {
            var prefix = ",GraphRankingModel%3Aaction%5C%3A" + actionId + "%5C%2Cweight%5C%3A1%5C%2CedgeFunc%5C%3A";
            var suffix = "%5C%2CmergeFunc%5C%3Amax";
            return (graphRankingType) ? prefix + graphRankingType + suffix : "";
        }

        /*
         * Gets the url components to append to "_api/search/query?" for a given (rule, query object) pair.
         *
         * @param queryRule The query rule.
         * @param queryObj The query object.
         * @return A string of query url components.
         */
        function getQueryUrlComponents(queryRule, queryObj) {
            var queryUrlComponents = [];
            if (queryRule.queryText) {
                var queryText = stringFormat(queryRule.queryText, queryObj.entities);
                // TODO: Rewrite to avoid duplication with graphdatasource.ts
                var docFilter = "(FileExtension:doc OR FileExtension:docx OR FileExtension:ppt OR FileExtension:pptx OR FileExtension:xls OR FileExtension:xlsx OR FileExtension:pdf)";
                queryUrlComponents.push("querytext='(" + encodeURIComponent(queryText) + ")%20AND%20" + encodeURIComponent(docFilter) + "'");
            }

            if (queryRule.graphQuery) {
                var graphString = queryRule.graphQuery;
                var graphQuery = stringFormat(graphString, queryObj.entities);

                var actionId = extractActionId(graphString);
                var rankingExpression = getRankingModelExpression(queryRule.graphRankingType, actionId);
                queryUrlComponents.push("Properties='GraphQuery:" + encodeURIComponent(graphQuery) + rankingExpression + "'");
            }

            return queryUrlComponents.join("&");
        }

        /*
         * Gets a list of suggestions from raw user input.
         *
         * @param queryString The string to match against suggestions.
         * @param currentUserDoc The search result document of the current user.
         * @param personEntities A list of person entities to use for matching.
         * @param siteEntities A list of site entities to use for matching.
         * @return A list of suggestions ordered by relevancy.
         */
        mod.getMatchingQuerySuggestions = getMatchingQuerySuggestions = function(queryString, currentUserDoc, personEntities, siteEntities) {
            var result = [];

            //if (queryString.trim().length == 0) {
            //    return result;
            //}

            var queryObj = getQueryObject(queryString, currentUserDoc, personEntities, siteEntities);

            var selectedQueryRules = queryRules;
            var zeroTermQuery = queryString.trim().length == 0;
            if (zeroTermQuery) {
                selectedQueryRules = zeroTermQueryRules;
            }

            for (var i = 0; i < selectedQueryRules.length; i++) {
                var queryRule = selectedQueryRules[i];
                var queryRuleRank = getQueryRuleRank(queryRule, queryObj);
                if (queryRuleRank > 0 || zeroTermQuery) {
                    result.push({
                        querySuggestionValue: stringFormat(queryRule.querySuggestion, queryObj.entities),
                        querySuggestionLabel: stringFormat(queryRule.querySuggestion, queryObj.entities, "<b>", "</b>"),
                        queryUrlComponents: getQueryUrlComponents(queryRule, queryObj),
                        rank: queryRuleRank,
                        tagIcon: queryRule.tagIcon
                    });
                }
            }

            // Sort by highest rank
            result.sort(function (a, b) { return (a.rank < b.rank) ? 1 : ((a.rank > b.rank) ? -1 : 0); });
            return result;
        };

        mod.getQueryForTag = getQueryForTag = function (tag, currentUserDoc) {
            // Not sure we need for more than My Pulse, so only supporting that tag for now
            if (tag.toLowerCase() === MS.Oil.Tags.myPulse.toLowerCase()) {
                var queryObj = getQueryObject("", { DocId: currentUserDoc || "me", MeString: "me" }, [], []);
                var queryComponent = getQueryUrlComponents(myPulseRule, queryObj);
                return queryComponent;
            }
            return "";
        };

        return mod;
    }

    return bindQueryRulesModule({});
    
});

//
// Module: tag
//

define.names.push("tag");
define(["require", "exports", "../ext/msfuncy-0.9", "../ext/queryrules", "search", "registry", "msg"], function(require, exports, _, qrules, search, reg, msg) {
    

    (function (RepresentativeTag) {
        /**
        * Unknown tag.
        */
        RepresentativeTag[RepresentativeTag["Unknown"] = 0] = "Unknown";

        /**
        * MyPulse tag.
        */
        RepresentativeTag[RepresentativeTag["MyPulse"] = 1] = "MyPulse";

        /**
        * Modified by me tag
        */
        RepresentativeTag[RepresentativeTag["MyWork"] = 2] = "MyWork";

        /**
        * Popular with people rag
        */
        RepresentativeTag[RepresentativeTag["PopularWithMyColleagues"] = 3] = "PopularWithMyColleagues";

        /**
        * Recently viewed tag
        */
        RepresentativeTag[RepresentativeTag["ItemsIViewed"] = 4] = "ItemsIViewed";

        /**
        * Presented to me tag
        */
        RepresentativeTag[RepresentativeTag["PresentedTo"] = 5] = "PresentedTo";

        /**
        * Trending around tag
        */
        RepresentativeTag[RepresentativeTag["TrendingAround"] = 6] = "TrendingAround";

        /**
        * Liked by tag
        */
        RepresentativeTag[RepresentativeTag["LikedBy"] = 7] = "LikedBy";

        /**
        * Shared with tag
        */
        RepresentativeTag[RepresentativeTag["SharedWith"] = 8] = "SharedWith";
    })(exports.RepresentativeTag || (exports.RepresentativeTag = {}));
    var RepresentativeTag = exports.RepresentativeTag;

    /**
    * Plugin that filters tags based on query properties.
    */
    var TagPlugin = (function () {
        function TagPlugin() {
            this._relatedPeople = [];
            this._actorId = "me";
            this._useGnl = false;
            this._pluginService = null;
            this._maxNumberOfTags = 7;
        }
        /**
        * Get the query associated with the My Pulse tag for current user.
        */
        TagPlugin.getMyPulseQuery = function () {
            return qrules.getQueryForTag(reg.Tags.myPulse, "me");
        };

        TagPlugin.prototype.getId = function () {
            return "tag";
        };

        TagPlugin.prototype.initialize = function (pluginService) {
            var that = this;

            pluginService.query().subscribe(function (queryLifecycle) {
                var properties = queryLifecycle.getQuery().getProperties();
                var progressSource = queryLifecycle.createProgressSource(that);
                var term = properties[reg.queryProperties.term];
                progressSource.onNext(that.getTags(term));
                progressSource.onCompleted();
            });

            this._pluginService = pluginService;
        };

        /**
        * Call to enable GNL suggestions.
        */
        TagPlugin.prototype.enableGuidedNaturalLanguage = function () {
            var that = this;
            that._useGnl = true;

            // Get related people.
            that._pluginService.message().where(function (m) {
                return m.getType() === msg.MessageTypes.relatedPeopleMessage;
            }).take(1).select(function (msg) {
                return msg.getData();
            }).subscribe(function (relatedPeople) {
                that._relatedPeople = relatedPeople;
            });

            // Get my properties.
            that._pluginService.message().where(function (msg) {
                return msg.getType() === "MyUserProfileData";
            }).take(1).select(function (msg) {
                return msg.getData();
            }).subscribe(function (properties) {
                that._myProperties = properties;
            });
        };

        TagPlugin.prototype.getTags = function (term) {
            var that = this;
            return !term && !that._useGnl ? reg.Tags.getTags().map(function (tag) {
                return { name: tag };
            }).slice(0, that._maxNumberOfTags) : that.filterTags(term);
        };

        TagPlugin.prototype.filterTags = function (term) {
            var that = this, myProps = that._myProperties;
            if (this._useGnl) {
                var me = {
                    PreferredName: (myProps && myProps.preferredName) || "",
                    DocId: that._actorId,
                    WorkEmail: (myProps && myProps.workEmail) || "",
                    UserProfile_GUID: (myProps && myProps.myGUID) || ""
                };
                if (!term) {
                    term = "";
                }
                ;
                var suggestions = qrules.getMatchingQuerySuggestions(term, me, that._relatedPeople, []);
                return _.map(function (suggestion) {
                    return that.createGNLResult(suggestion);
                }, suggestions).slice(0, that._maxNumberOfTags);
            } else {
                var tagObjects = reg.Tags.getTags().map(function (tag) {
                    return ({ name: tag, highlightName: tag });
                });
                var tokenizedTerm = search.whitespaceTokenizer(term);
                var results = search.search({ name: search.prefixWord }, tokenizedTerm, tagObjects);
                var filteredScore = search.filterScoredData(function (score) {
                    return score.name;
                }, results);
                return search.highlightData({ highlightName: search.prefixHighlightUsingTagMark }, tokenizedTerm, filteredScore);
            }
        };

        TagPlugin.prototype.createGNLResult = function (suggestion) {
            return {
                name: suggestion.querySuggestionValue,
                urlComponent: suggestion.queryUrlComponents,
                representativeTag: suggestion.tagIcon,
                highlightName: suggestion.querySuggestionValue
            };
        };
        return TagPlugin;
    })();
    exports.TagPlugin = TagPlugin;
});

//
// Module: export
//

define.names.push("export");
define(["require", "exports", "../ext/msfuncy-0.9", "../ext/rx.time", "msg", "plugin2"], function(require, exports, _, rxt, msg, oil) {
    

    

    

    

    /**
    * Exports data federated by the Office 365 Insights Layer (OIL) data.
    */
    var ExportPlugin = (function () {
        /**
        * Initializes a new export plugin instance with the specified
        * arguments.
        *
        * @param plugins A list of the ids of the plugins that provide data to
        * export.
        * @param dataDelegate The data delegate.
        * @param errorDelegate The error delegate.
        */
        function ExportPlugin(plugins, dataDelegate, errorDelegate) {
            var that = this;
            that._plugins = plugins;
            that._dataDelegate = dataDelegate;
            that._errorDelegate = errorDelegate;
        }
        /**
        * Processes the the specified data using the specified processors.
        *
        * @param processors The processors.
        * @param data The data to process.
        */
        ExportPlugin.process = function (processors, data) {
            _.asrt(_.isObject, "Processors argument must be an object.", processors);
            _.asrt(_.isObject, "Data argument must be an object.", data);
            var prop, processor, res = {};
            for (prop in data) {
                processor = processors[prop];
                if (processor) {
                    _.asrt(_.isFunc, "Processors object must contain functions.", processor);
                    res[prop] = processor(data[prop]);
                }
            }
            return res;
        };

        /**
        * Get the plugin id.
        */
        ExportPlugin.prototype.getId = function () {
            return "export";
        };

        /**
        * Initializes the plugin.
        */
        ExportPlugin.prototype.initialize = function (ps) {
            var that = this, isRelevantPlugin = oil.pluginProgressFilter(that._plugins), dataProcessor = function (processors) {
                ExportPlugin.process(processors, this.data);
            }, newDataProcessor = function (processors) {
                ExportPlugin.process(processors, this.newData);
            };

            ps.message().where(function (m) {
                return m.getType() === msg.MessageTypes.errorMessage;
            }).select(function (msg) {
                return msg.getData();
            }).subscribe(that._errorDelegate);

            ps.query().subscribe(function (ql) {
                // Setting up fresh data to be aggregated and shared with UI.
                var exportData = {
                    first: true,
                    complete: false,
                    data: {},
                    newData: {},
                    processData: dataProcessor,
                    processNewData: newDataProcessor
                }, progressSeq = ql.progress().where(isRelevantPlugin).doAction(function (progress) {
                    return _.asrt(_.isArray, "Export plugin only accept arrays.", progress.getData());
                }).scan(exportData, function (accumulate, progress) {
                    var id = progress.getSource().getId(), data = progress.getData(), cumulativeData = accumulate.data[id], cumulativeNewData = accumulate.newData[id];
                    accumulate.data[id] = cumulativeData ? cumulativeData.concat(data) : data;
                    accumulate.newData[id] = cumulativeNewData ? cumulativeNewData.concat(data) : data;
                    return accumulate;
                });

                rxt.Observable.returnValue(exportData).concat(progressSeq).throttle(10, that._scheduler).select(function (data) {
                    var res = _.extend({}, data);
                    res.data = _.extend({}, data.data);
                    return res;
                }).doAction(function (data) {
                    exportData.first = false;
                    exportData.newData = {};
                }).subscribe(that._dataDelegate, that._errorDelegate, function () {
                    // Making sure that we signal query completion when
                    // progress is completed.
                    exportData.complete = true;
                    exportData.newData = {};
                    that._dataDelegate(exportData);
                });
            });
        };
        return ExportPlugin;
    })();
    exports.ExportPlugin = ExportPlugin;
});

//
// Module: query
//

define.names.push("query");
define(["require", "exports", "../ext/msfuncy-0.9", "../ext/queryrules", "../ext/rx", "registry", "msg", "map", "sputils", "spds"], function(require, exports, _, qrules, rx, reg, msgMod, map, sputils, spds) {
    var QueryPlugin = (function () {
        /**
        * Initializes a new query plugin with the specified select property
        * maps and handlers.
        *
        * @param maps A list of select property maps which contain information
        * about how to map the result from the search index to a view model.
        */
        function QueryPlugin(maps) {
            this._pluginService = null;
            /**
            * Initializes the plugin.
            */
            this.initialize = _.explain("QueryPlugin: initialize", function (pluginService) {
                var that = this, queryProps = QueryPlugin.queryProperties, getQueryProps = function (ql) {
                    return ql.getQuery().getProperties();
                };
                that._clientType = encodeURIComponent(pluginService.getClientId());
                that._pluginService = pluginService;
                that._ds = new spds.SpDataSource("query", pluginService.getClientVersion(), 600000);
                that._selectProps = map.getSourceNames(that._maps);

                function getItem(url) {
                    return that._ds.getItem({ query: url });
                }

                that._ds.map = (function (obs) {
                    return obs.select(that._queryResults(that._maps));
                });
                that.preFetchBoards();

                function queryHandler(ql) {
                    var url = ql.getQuery().getProperties()[queryProps.query];
                    if (!_.isString(url) || url.length < 1) {
                        var msg = "QuyeryPlugin: The 'query' query property " + "must be a none empty string.";
                        pluginService.message().onNext(new msgMod.Message(msgMod.MessageTypes.errorMessage, that, new Error(msg)));
                        return;
                    }
                    var progressSource = ql.createProgressSource(that), subscription = getItem(that.createQuery(url, that._clientType)).subscribe(function (d) {
                        progressSource.onNext(d);
                        progressSource.onCompleted();
                    }, function (e) {
                        progressSource.onNext([]);
                        that._pluginService.message().onNext(new msgMod.Message(msgMod.MessageTypes.errorMessage, that, e));
                        progressSource.onCompleted();
                    });

                    ql.progress().subscribe(undefined, undefined, function () {
                        return subscription.dispose();
                    });
                }

                // Happens for every query.
                pluginService.query().where(function (ql) {
                    return queryProps.query in getQueryProps(ql);
                }).subscribe(queryHandler);
            });
            this._maps = maps;
        }
        /**
        * Get the id.
        */
        QueryPlugin.prototype.getId = function () {
            return "query";
        };

        /**
        * Constructs GNL query based on GNL query suggestion + client type.
        *
        * @param gnlPartQuery The gnl query created by the query rules class.
        * @param clientType The clientType to set on the query for logging/tracking purposes.
        *
        * @return string The complete query to execute.
        */
        QueryPlugin.prototype.createQuery = function (gnlPartQuery, clientType) {
            var that = this;
            var queryPrefix = "/_api/search/query?", rankingModel = "0c77ded8-c3ef-466d-929d-905670ea1d72";

            var gnlQuery = queryPrefix + gnlPartQuery + "&SelectProperties='" + that._selectProps + "'&RankingModelId='" + rankingModel + "'&RowLimit=50&StartRow=0&ClientType='" + clientType + "'&BypassResultTypes=true";

            return gnlQuery;
        };

        QueryPlugin.prototype._queryResults = function (maps) {
            var _primaryQueryResultPath = "d.query.PrimaryQueryResult".split(".");
            var _resulItemsPath = "RelevantResults.Table.Rows.results".split(".");

            return _.pipe(_.explain("Traversing path '" + _primaryQueryResultPath.join(".") + "'", _.bind(_.oquery, _primaryQueryResultPath)), function (pqr) {
                return !pqr ? [] : _.oquery(_resulItemsPath, pqr);
            }, sputils.resultItemsProcessor(maps));
        };

        /**
        * Will pre fetch all Oslo boards by calling GNL getMatchingQuerySuggestions with empty search term.
        * The first board (My Pulse) is fetched immediately, whereas the other boards will be fetched in
        * sequence after 15 seconds.
        */
        QueryPlugin.prototype.preFetchBoards = function () {
            var that = this;

            // Pre fetch data
            that._pluginService.message().where(function (msg) {
                var message = msg.getType();
                return message === "MyUserProfileData";
            }).take(1).select(function (msg) {
                return msg.getData();
            }).subscribe(function (myProps) {
                var me = {
                    PreferredName: (myProps && myProps.preferredName) || "",
                    DocId: "me",
                    WorkEmail: (myProps && myProps.workEmail) || "",
                    UserProfile_GUID: (myProps && myProps.myGUID) || ""
                };
                var suggestions = qrules.getMatchingQuerySuggestions("", me, [], []);
                var sequences = [];

                function coldGetItem(url) {
                    return rx.Observable.createWithDisposable(function (observer) {
                        return that._ds.getItem({ query: url }).subscribe(observer);
                    });
                }
                ;
                for (var i = 0; i < suggestions.length; i++) {
                    var query = suggestions[i];
                    var obs = coldGetItem(that.createQuery(query.queryUrlComponents, that._clientType));

                    //The first query should be executed immediately, but then delay the rest.
                    //Note: setting delay on the first will make the first execute immediately but delay the rest
                    if (i == 0) {
                        sequences.push(obs.delay(15000)); //15 seconds is by Oslo request
                    } else {
                        sequences.push(obs);
                    }
                }

                rx.Observable.concat(sequences).subscribe();
            });
        };
        QueryPlugin.queryProperties = {
            /**
            * Identifies the query property.
            */
            query: reg.queryProperties.query
        };
        return QueryPlugin;
    })();

    
    return QueryPlugin;
});

//
// Module: peoplebase
//

define.names.push("peoplebase");
define(["require", "exports", "map", "sputils", "spds"], function(require, exports, map, sputils, spds) {
    var PeopleBase = (function () {
        function PeopleBase(_maps) {
            this._maps = _maps;
            var that = this;
            that._selectProps = map.getSourceNames(that._maps);
        }
        /**
        * Construct a person query based on userName and clientType.
        *
        * @param userName The userName to search for
        * @param clientType The clientType to set on the query for
        * logging/tracking purposes.
        *
        * @return string The complete query to execute.
        */
        PeopleBase.prototype.createQuery = function (userName, clientType) {
            var that = this;

            var url = "/_api/search/query?" + "QueryTemplate='UserName:" + userName + "'" + "&SourceId='b09a7990-05ea-4af9-81ef-edfab16c4e31'" + "&SelectProperties='" + that._selectProps + "'" + "&ClientType='" + clientType + "'" + "&BypassResultTypes=true";

            return url;
        };

        PeopleBase.prototype.createDataSource = function (id, version) {
            var that = this, ds = new spds.SpDataSource(id, version, 600000);
            ds.map = (function (obs) {
                return obs.select(sputils.mapResults(that._maps));
            });
            return ds;
        };
        PeopleBase.queryProperties = {
            /**
            * Identifies an email query. Provide the email to look up here.
            * If not provided, current user is queried instead.
            */
            email: "peoplePluginEmail",
            /**
            * Identifies a person query by full name. This is used as a person
            * query fallback if email is not set.
            */
            fullName: "peoplePluginFullName",
            /**
            * Identifies a userName query. Provide the userName to look up here.
            */
            userName: "peoplePluginUserName"
        };
        return PeopleBase;
    })();

    
    return PeopleBase;
});

//
// Module: organizational
//

define.names.push("organizational");
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define(["require", "exports", "../ext/msfuncy-0.9", "msg", "peoplebase"], function(require, exports, _, msg, pbase) {
    var OrganizationalPlugin = (function (_super) {
        __extends(OrganizationalPlugin, _super);
        /**
        * Initializes a new query plugin with the specified select property
        * maps and handlers.
        *
        * @param maps A list of select property maps which contain information
        * about how to map the result from the search index to a view model.
        */
        function OrganizationalPlugin(maps) {
            _super.call(this, maps);
            this._pluginService = null;
            this._ds = null;
            /**
            * Initializes the Organizational plugin.
            */
            this.initialize = _.explain("OrganizationalPlugin: initialize", function (pluginService) {
                var that = this, clientType = encodeURIComponent(pluginService.getClientId()), getQueryProps = function (ql) {
                    return ql.getQuery().getProperties();
                }, getUserName = function (ql) {
                    return getQueryProps(ql)[pbase.queryProperties.userName];
                }, getItem = function (url) {
                    return that._ds.getItem({ query: url });
                };

                // Store instance data.
                that._pluginService = pluginService;

                // Set up SP Datasource with result mapper.
                that._ds = that.createDataSource(that.getId(), pluginService.getClientVersion());

                function queryHandler(ql) {
                    var progressSource = ql.createProgressSource(that), userName = getUserName(ql), subscription = getItem(that.createQuery(userName, clientType)).subscribe(function (d) {
                        progressSource.onNext(d);
                        progressSource.onCompleted();
                    }, function (e) {
                        progressSource.onNext([]);
                        that._pluginService.message().onNext(new msg.Message(msg.MessageTypes.errorMessage, that, e));
                        progressSource.onCompleted();
                    });

                    ql.progress().subscribe(undefined, undefined, function () {
                        return subscription.dispose();
                    });
                }

                // Happens for every query with a non-empty userName query property.
                pluginService.query().where(function (ql) {
                    return ql.hasValidProperty(pbase.queryProperties.userName);
                }).subscribe(queryHandler);
            });
        }
        /**
        * Get the plugin id.
        */
        OrganizationalPlugin.prototype.getId = function () {
            return "organizational";
        };
        OrganizationalPlugin.logTypes = {
            /**
            * Identifies a request log entry.
            */
            request: "organizationalPluginRequest",
            /**
            * Identifies a response log entry.
            */
            response: "organizationalPluginResponse"
        };
        return OrganizationalPlugin;
    })(pbase);

    
    return OrganizationalPlugin;
});

//
// Module: persondocuments
//

define.names.push("persondocuments");
define(["require", "exports", "../ext/msfuncy-0.9", "../ext/rx", "msg", "graphdatasource", "sputils", "registry", "peoplebase"], function(require, exports, _, rx, msg, gds, sputils, reg, pbase) {
    var PersonDocumentsPlugin = (function () {
        /**
        * Create a new instance of the PersonDocuments plugin.
        *
        * @param maps A list of select property maps which contain information
        * about how to map the result from the search index to a view model.
        */
        function PersonDocumentsPlugin(maps) {
            this._propertyKeyName = "PreferredName";
            this._propertyKeyActorId = "DocId";
            this._rowLimit = 30;
            /**
            * Initializes the plugin.
            */
            this.initialize = _.explain("PersonDocumentsPlugin: initialize", function (pluginService) {
                var that = this;

                function queryHandler(queryLifeCycle) {
                    var progressSource = queryLifeCycle.createProgressSource(that);

                    queryLifeCycle.progress().where(function (progress) {
                        return progress.getSource().getId() == "organizational";
                    }).take(1).select(function (sharedProgress) {
                        return sharedProgress.getData();
                    }).subscribe(getPersonDocuments);

                    function getPersonDocuments(personData) {
                        var principal = personData && personData.length > 0 && personData[0], ret = [];

                        if (!principal) {
                            progressSource.onCompleted();
                            return;
                        }

                        var clientType = encodeURIComponent(pluginService.getClientId()), refreshInterval = 600000, actorId = principal[that._propertyKeyActorId], name = principal[that._propertyKeyName];

                        if (actorId) {
                            var graphDataSource = new gds.GraphDataSource("graph", pluginService.getClientVersion(), clientType, refreshInterval, that._maps), lookupKey = {
                                Tag: reg.Tags.trendingAroundMe,
                                Term: "",
                                ActorId: actorId,
                                RowLimit: that._rowLimit,
                                Author: name
                            };

                            var trendingObs = graphDataSource.getItem(lookupKey);
                            lookupKey.Tag = reg.Tags.modifiedByMe;
                            var modifiedObs = graphDataSource.getItem(lookupKey);

                            var results = [];
                            rx.Observable.merge(trendingObs, modifiedObs).subscribe(function (d) {
                                return results.push(d);
                            }, function (e) {
                                progressSource.onNext([]);
                                that._pluginService.message().onNext(new msg.Message(msg.MessageTypes.errorMessage, that, e));
                                progressSource.onCompleted();
                            }, function () {
                                var res = sputils.interleaveResults(results);
                                progressSource.onNext(res);
                                progressSource.onCompleted();
                            });
                        }
                    }
                }

                pluginService.query().where(function (ql) {
                    return ql.hasValidProperty(pbase.queryProperties.userName);
                }).subscribe(queryHandler);
            });
            this._maps = maps;
        }
        /**
        * Get the id.
        */
        PersonDocumentsPlugin.prototype.getId = function () {
            return "persondocuments";
        };
        return PersonDocumentsPlugin;
    })();

    
    return PersonDocumentsPlugin;
});

//
// Module: cowapp
//

define.names.push("cowapp");
//
// This is the OIL main file for the Codename Oslo Web web application.
//
define(["require", "exports", "registry", "msg", "map", "sputils", "plugin2", "actor", "graph", "peoplesuggestion", "myproperties", "signal", "tag", "export", "query", "organizational", "persondocuments"], function(require, exports, reg, msg, map, sputils, oil, actor, graph, peep, myprops, signal, tagMod, exp, queryMod, org, peepdocs) {
    window.MS = {
        Oil: {
            PluginService: oil.PluginService,
            Query: oil.Query,
            PropertyMap: map.propMap,
            EdgesAsyncPropertyMap: sputils.edgesAsyncPropMap,
            ActorPlugin: actor.ActorPlugin,
            GraphPlugin: graph,
            PeopleSuggestionPlugin: peep,
            MyPropertiesPlugin: myprops.MyPropertiesPlugin,
            SignalPlugin: signal,
            TagPlugin: tagMod.TagPlugin,
            ExportPlugin: exp.ExportPlugin,
            QueryPlugin: queryMod,
            Tags: reg.Tags,
            MessageTypes: msg.MessageTypes,
            OrganizationalPlugin: org,
            PersonDocumentsPlugin: peepdocs
        }
    };
});

window.Rx = oldRx;
