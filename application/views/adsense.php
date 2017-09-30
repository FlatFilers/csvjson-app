<h4>&nbsp;</h4>
<?php if (ENVIRONMENT == 'production'): ?>
  <script type="text/javascript">
    ( function() {
      if (window.CHITIKA === undefined) { window.CHITIKA = { 'units' : [] }; };
      var unit = {"calltype":"async[2]","publisher":"martindrapeau","width":300,"height":250,"sid":"Chitika Default"};
      var placement_id = window.CHITIKA.units.length;
      window.CHITIKA.units.push(unit);
      document.write('<div id="chitikaAdBlock-' + placement_id + '"></div>');
  }());
  </script>
  <script type="text/javascript" src="//cdn.chitika.net/getads.js" async></script>
<?php endif; ?>