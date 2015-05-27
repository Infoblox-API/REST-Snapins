//Webix CDN files are available online for HTTP or HTTPS including their fonts
//Place the following lines in your HTML file

//    <link rel="stylesheet" href="https://cdn.webix.com/edge/webix.css" type="text/css"> 
//    <script src="https://cdn.webix.com/edge/webix.js" type="application/javascript"></script>  

// webix supports a simple require, but only relative to the 'codebase'
// folder, so we can't go there much...

//console.log ( 'codebase' , webix.codebase );
//console.log ( 'url' , window.location , location );

//Here for reference, not needed for this script
// webix has no concept of query string params or pathnames in any
// reasonable form, so we just use a home grown query string hack
/*
function GetQueryStringParams(sParam) {
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam)
        {
            return sParameterName[1];
        }
    }
    return null;
}
var proxy = GetQueryStringParams('p');
*/

//Variable for the initial number of columns before we add EAs, Options, etc.
var NUM_COLUMNS=8;

//---------------------------------
// set up the REST location
//var myServer = proxy ? location.host + '/proxy/' + proxy : location.host ;
var myServer = location.host ;
var base_url = "https://" + myServer + "/wapi/v1.4/";
//console.log ( 'rest server' , base_url );

//---------------------------------
//Initialize the Webix Ready and Helper functions

//---------------------------------
// MAIN ENTRY POINT

webix.ready(function(){
    renderMain();
});

//---------------------------------
// HELPER Functions
webix.error = function(myText) {
    webix.message({type:"error", text: myText});
};

//---------------------------------
// Data controls

//---------------------------------
// Define our UI

var gridPanel = {
    rows: [
//---------------------------------
//First row is our form
//---------------------------------
    {
        view:"toolbar",
        id:"myToolbar",
        cols:[
            { view:"text", 
                id: 'query',
                //label:"Hostname|Prefix", 
                placeholder: 'hostname/ip (regex)',
                width: 200,
                //value:'linux',
                name: 'query' },
			{ view:"select",
				id: 'querytype',
				name: 'querytype',
				options: ['Name','Alias','IPv4','IPv6','MAC','Comment'],
				width: 100
			},
            { view:"button", id:"gridDelBut", value:"Search", 
//When this search button is clicked, we will do an onGridSearch()
                click: 'onGridSearch',
                width:100, align:"left" },
            { view:"text",
            	id: 'max_results', 
                //label:"Hostname|Prefix",
                label: 'Max Results', 
                labelWidth: 100,
                labelAlign: 'right',
                placeholder: 'Max Results',
                width: 200,
                value:'100',
                name: 'max_results' },
            { view:"text",
            	id: 'total_records', 
                //label:"Hostname|Prefix",
                label: 'Returned Records:', 
                labelWidth: 125,
                labelAlign: 'right',
                placeholder: '0',
                width: 200,
//                value:'0',
                name: 'total_records'},
        ]
    },
//---------------------------------
//Second row is our table
//---------------------------------
    {
        id: "gridPanelGrid",
//Helper functions
        on:{
          onBeforeLoad:function(){
            this.showOverlay("Loading...");
          },
          onAfterLoad:function(){
            if (!this.count()){this.showOverlay("Sorry, there is no data");}
            else{this.hideOverlay();}
          }
        },
        view:"datatable",

//Set all of the table attributes
        select:"cell",
        multiselect:true,
        clipboard:"selection",
        resizeColumn: true,
//Uncomment the following if you want pagination        
/*
//Link Pager to "pager" div ID from main HTML file
        pager:{
          template:"{common.first()} {common.prev()} {common.pages()} {common.next()} {common.last()}",
          container:"pager",
          autosize:true,
          group:10
    	},        
*/
        leftSplit:3,
        minColumnWidth:150,
		//autoheight:true,
		//autowidth:true,
        //footer:true,
        //autoConfig:true
        // we /could/ use autoConfig, but it sets default widths (50px)
        // and the effort to walk the dataaset and resize everything
        // calling datatable.adjustColumn("title", "header");
        // is ineffecient since we are calling things like 'parse' that
        // will have done it N times already
        //
        // So we manually define the base columns, then add additional
        // columns later
//---------------------------------
//Define our Columns in the table here
//---------------------------------

        columns:[
            //autowidth:true,
            // sort == int or string
            // adjust:"data" : set col width to widest item
            // adjust:"header" : set col width to header string 
            // fillspace:true : column widens to all avallable space
//            {id:"_ref", hidden: true, header:"ref", adjust:"data" },
            {id:"view", header:["View",{content:"selectFilter"}], adjust:"data", sort:"string"},
            {id:"name", header:["Name",{content:"textFilter"}], adjust:"data", sort:"string"},
            {id:"aliases", header:["Aliases",{content:"textFilter"}], adjust:"data", sort:"string"},
            {id:"ipv4addrs", header:["IPv4 Address",{content:"textFilter"}], adjust:"data", sort:"string"},
            {id:"ipv6addrs", header:["IPv6 Address",{content:"textFilter"}], adjust:"data", sort:"string"},
            {id:"zone", header:["Zone",{content:"selectFilter"}], adjust:"data", sort:"string"},
            {id:"comment", header:["Comment",{content:"textFilter"}], sort:"string"},
//Have a hard time sorting and filtering on boolean values, even if I convert them .toString(), so just make it sortable
            {id:"disable", header:"Disabled", rowspan:2, adjust:"header", sort:"string"}
//Can't do this because the select box uses the original values
//            {id:"disable", header:["Disabled",{content:"selectFilter"}], adjust:"header", sort:"string", format:function(value){
//				value=='true' ? value="Yes" : value="No";
//				return(value);
//            	}
//            }
        ]
    },
//---------------------------------
//Third & Forth row is our table to bound the datatable
//---------------------------------    
    {
    view:"resizer",
    },
    {
    view:"template",
    template:"Written by Brad Andersen (<a href='mailto:brad@bradandersen.com?subject=WAPI%20Question'>brad@bradandersen.com</a>)",
    type:"clean",
    height:40
    }
    ]

};

//---------------------------------
// UI Controllers


//Run this when the search button is pressed
function onGridSearch() {
    var myGrid = $$("gridPanelGrid");

//Remove any rows from the table from a previous run
    myGrid.clearAll();
    myGrid.showOverlay("Loading...");


// Setup the AJAX query
    var params={
            '_max_results' : $$("myToolbar").getValues().max_results,
            '_return_fields%2B' : 'comment,disable,view,zone,extattrs,aliases'
    };
    var query=$$("myToolbar").getValues().query;
    var querytype=$$("myToolbar").getValues().querytype;
    var queryop="~:"; //Case-insensitive regular expression search
    var queryobj="name";
    if(querytype=="Alias"){var queryobj="alias";}
    if(querytype=="Comment"){var queryobj="comment";}
    if(querytype=="MAC"){var queryobj="mac";}
    if(querytype=="IPv6"){var queryobj="ipv6addr";}
//IPv4 search do not have letters, so case-sensitivity does not work in the Infoblox API
    if(querytype=="IPv4"){var queryop="~"; var queryobj="ipv4addr";}
//Set a query operation if the query field has data
    if(query){
      var toquery=queryobj+queryop;
      toquery=toquery.toString();
      params[toquery]=query;
//console.log(toquery);
    }

//console.log(params);
    webix.ajax().get( base_url + 'record:host', params,
        // handlers
        {
            error:function(text, data, request){
                webix.error(request.status+':'+text);
            },
//Take the data.json from Infoblox API and add it to the table            
            success:function(text, data, request){
                //console.log ( 'hosts' , data.json() );
                var myGrid = $$("gridPanelGrid");
                myGrid.hideOverlay();
                myGrid.showOverlay("Processing...");
                addResultsToGrid( data.json() );
            }
        });

    
}


//---------------------------------
//Add results to Webix datatable
//---------------------------------

function addResultsToGrid( json ) {
    var myGrid = $$("gridPanelGrid");
    
    // if you add rows to the grid, they don't autosize or support
    // autoConfig, so you should parse the whole dataset at once, clean
    // it up, then punt it to the renderer

    // walk each element of the grid and clean it up
    // and track all unique EAs
    var eaValues = {};
    var jsonarray=webix.toArray( json );
    jsonarray.each( function(rec) {

// flatten addresses, aliases, macs, Extensible Attributes
        var ipv4addrs = [];
        var ipv6addrs = [];
        var aliases = [];
//Does not work trying to turn a boolean into a string, webix.datatable still can't sort/filter
//        if (rec.disable){
//           rec.disable=rec.disable.toString();
//        }
        if ( rec.ipv4addrs ) {
            // use the webix toArray() + each()
            webix.toArray( rec.ipv4addrs ).each( function(ip) {
                ipv4addrs.push( ip.ipv4addr );
            });
            if ( ipv4addrs.length > 0 ) {
              rec.ipv4addrs = ipv4addrs.join(", ");
       		}

        }
        if ( rec.ipv6addrs ) {
            webix.toArray( rec.ipv6addrs ).each( function(ip) {
                ipv6addrs.push( ip.ipv6addr );
            });
            if ( ipv6addrs.length > 0 ) {
              rec.ipv6addrs = ipv6addrs.join(", ");
            }
        }
        if ( rec.aliases ) {
            rec.aliases=rec.aliases.join(", ");
//			console.log(rec.aliases);
        }

        // flatten EAs and add them as unique fields
        if ( rec.extattrs ) {
            Object.keys(rec.extattrs).forEach(function(key,index) {
//console.log(key+'='+JSON.stringify(index));
                var eaname = 'EA_'+key;
				//Replace spaces and dashes with underscores or webix.datatable will wrap the headers
                eaname=eaname.replace(/[\s\-]/ig,"_");                
                rec[eaname] = rec.extattrs[key].value;
//console.log(rec.extattrs[key].value," -",eaname," - ",rec[eaname]);
                // and track this new EA in a hash
                eaValues[eaname] = 1 ;
            });

        }
//console.log ( 'rec' , rec );

    });

    // now add unique EA values as extra columns to the config at the end
    var columns = webix.toArray(myGrid.config.columns);
    
//If we do multiple searches our columns keep getting appended, so we must remove what was added previously.    
    for (i = columns.length; i >= NUM_COLUMNS; i--) { 
      columns.removeAt(i);
//      console.log(columns.length,'- removing ', i);
    }

    Object.keys(eaValues).sort(function(s1, s2){var l=s1.toLowerCase(), m=s2.toLowerCase();return l===m?0:l>m?1:-1;}).forEach(function(key,index) {
//console.log(key+'='+index);
        columns.insertAt({
            id: key,
            header: [key,{content:"textFilter"}],
            adjust:"header",
            sort:"string"
        },columns.length);
    });

//Various methods for refreshing columns, header, etc.
//    myGrid.refreshHeaderContent();
    myGrid.refreshColumns();
//    myGrid.refresh();
    myGrid.parse( json );
//    datatable.adjustColumn("title", "data");

//    var numrows=webix.toArray(json).length;

//  if you run this as text/javascript you have to do it this way
//    var elem = document.getElementById("total_records");
//    elem.value = numrows;
//    console.log(elem);
//  however, if you run this as application/javascript, this works
//    document.getElementById("total_records").value = numrows;
    document.getElementById("total_records").value = jsonarray.length;    
//    webix.alert("Rows Returned: "+numrows);

}

//---------------------------------
// on Ready :

function renderMain() {
//    console.log ( "page rendered : ok" );

    // define the UI, 
    // this is all done with objects, so we can use vars

    webix.ui( gridPanel );

}

