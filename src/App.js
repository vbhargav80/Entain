import { useState, useEffect } from 'react';
import axios from 'axios';
import { get as _get, orderBy as _orderBy, filter as _filter } from 'lodash';
import { Table, ToggleButtonGroup, ToggleButton } from 'react-bootstrap';
import Countdown from 'react-countdown';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const renderer = ({ hours, minutes, seconds, completed }) => {
  if (completed) return <span>Running...</span>;
  return (
    <span>
      {`${hours > 0 ? `${hours}h ` : ''}${minutes > 0 ? `${minutes}m ` : ''}${seconds}s`}
    </span>
)};

const NegativeCountdown = ({pastSeconds, onComplete}) => {
  const [seconds, setSeconds] = useState(Math.abs(pastSeconds));

  useEffect(() => {
    if (seconds < 60) {
      setTimeout(() => setSeconds(seconds + 1), 1000);
    } else {
      onComplete();
    }
    // eslint-disable-next-line
  }, [seconds]);
  return <span className="negative-time">{`-${seconds}s`}</span>
}

const CountdownTimer = (props) => {
  const { startTime, onComplete } = props;
  const pastSeconds = (startTime - Date.now()) / 1000;
  if (pastSeconds < 0) {
    return <NegativeCountdown pastSeconds={Math.round(pastSeconds)} onComplete={onComplete} />;
  }
  return (
    <Countdown
      date={startTime}
      renderer={renderer}
      onComplete={onComplete}
    />
  );
}

function App() {
  const [races, setRaces] = useState([]);
  const [category, setCategory] = useState('');
  const [startTime, setStartTime] = useState(Date.now());
  const [running, setRunning] = useState(false);

  const getRaces = () => {
    axios.get(`https://api.neds.com.au/rest/v1/racing/?method=nextraces&count=10`)
      .then(res => {
        const raceSummaries = _get(res, 'data.data.race_summaries', {});
        let results = [];
        for (var key in raceSummaries) {
          results.push(raceSummaries[key]);
        }
        results = _orderBy(results, ['advertised_start.seconds'], ['asc']);
        results = _filter(results, (item) => {
          const advertisedStart = _get(item, 'advertised_start.seconds', 0);
          const current = new Date().getTime() / 1000;
          return advertisedStart - current > -60;
        });

        setRaces(results.slice(0, 5));
        if (results.length > 0) {
          const advertisedStart = _get(results[0], 'advertised_start.seconds');
          const diff = advertisedStart - new Date().getTime() / 1000;
          if (diff > 0) {
            setRunning(false);
            setStartTime(advertisedStart * 1000);
          } else {
            setRunning(true);
          }
        } else {
          setTimeout(getRaces, 60 * 1000);
        }
      });
  }
  const reload = () => {
    getRaces();
  }
  const onChangeCategory = (e) => {
    const val = e.target.value;
    if (val)
      setCategory(val === category ? '' : val);
  }
  useEffect(() => {
    getRaces();
    // eslint-disable-next-line
  }, []);

  const showRaces = category ? _filter(races, {category_id: category}) : races;
  return (
    <div className="App">
      <h1>Next to go</h1>
      <div className="my-5">
        <span className="me-3">Category:</span>
        <ToggleButtonGroup type="radio" name="categories" value={category} onClick={onChangeCategory}>
          <ToggleButton id="tbg-btn-1" value={'9daef0d7-bf3c-4f50-921d-8e818c60fe61'}>
            Greyhound
          </ToggleButton>
          <ToggleButton id="tbg-btn-2" value={'161d9be2-e909-4326-8c2c-35ed71fb460b'}>
            Harness
          </ToggleButton>
          <ToggleButton id="tbg-btn-3" value={'4a2788f8-e825-4d36-9894-efd4baf1cfae'}>
            Horse
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
      {/* {!running && (
        <div className="my-3">
          <span className="me-3">Next race will start within</span>
          <Countdown
            key={startTime}
            date={startTime}
            renderer={renderer}
          />
        </div>
      )} */}
      {/* {running && <div className="my-3">A Race is Running...</div>} */}
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>#</th>
            <th>Race Name</th>
            <th>Meeting Name</th>
            <th>Race Number</th>
            <th>Start within</th>
          </tr>
        </thead>
        <tbody>
          {showRaces.map((race, i) => (
            <tr key={race.race_id}>
              <td>{i + 1}</td>
              <td>{race.race_name}</td>
              <td>{race.meeting_name}</td>
              <td>{race.race_number}</td>
              <td>
                <CountdownTimer
                  startTime={race.advertised_start.seconds * 1000}
                  onComplete={reload}
                />
              </td>
            </tr>)
          )}
        </tbody>
      </Table>
    </div>
  );
}

export default App;
