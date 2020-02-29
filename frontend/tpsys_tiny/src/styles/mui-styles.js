export const drawerWidth = '25rem'
export const styles = theme => ({
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    width: drawerWidth,
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 .5rem 0 2rem',
    justifyContent: 'space-between',
    ...theme.mixins.toolbar,
  },
  appBar: {
    boxShadow: '0px 1px 5px 0px rgba(0, 0, 0, 0.05), 0px 2px 2px 0px rgba(0, 0, 0, 0.035), 0px 3px 1px -2px rgba(0, 0, 0, 0.03)',
    backgroundColor: '#fcfcfc',
    color: 'rgba(0,0,0,.87)',
    padding: '0 2rem',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    ...theme.mixins.toolbar,
  },
  modalNavBar: {
    boxShadow: '0 0 4px 0 rgba(0, 0, 0, 0.05), 0 1px 1px 0 rgba(0, 0, 0, 0.035), 0 2px 0 -2px rgba(0, 0, 0, 0.03)',
    backgroundColor: '#fdfdfd',
    color: 'rgba(0,0,0,.87)',
    minHeight: '64px',
    padding: '0 1rem 0 2rem',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...theme.mixins.toolbar,
  },
  indicator: {
    backgroundColor: '#66ccff',
  },
})
